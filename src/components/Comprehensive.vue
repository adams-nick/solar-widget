<template>
  <div class="comprehensive-analysis">
    <!-- Analysis status and progress -->
    <div class="analysis-header">
      <h2>Solar Analysis</h2>
      <div v-if="isAnalysisRunning" class="progress-container">
        <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
        <div class="progress-text">{{ progressMessage }}</div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isConnecting" class="loading-container">
      <div class="spinner"></div>
      <p>Starting solar analysis...</p>
    </div>

    <!-- Error state -->
    <div v-if="hasError" class="error-container">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
      <button @click="retry" class="retry-button">Try Again</button>
    </div>

    <!-- Initial state - no analysis running -->
    <div
      v-if="!isAnalysisRunning && !hasError && !hasRgbImage"
      class="start-container"
    >
      <p>Select a location to start the solar analysis</p>
    </div>

    <!-- Results are being streamed -->
    <div v-if="hasRgbImage" class="results-container">
      <!-- First view - RGB image -->
      <div class="rgb-container">
        <h3>Aerial View</h3>
        <img :src="rgbImageUrl" alt="Aerial view" class="rgb-image" />
      </div>

      <!-- Building insights (shows when available) -->
      <div v-if="buildingInsights" class="building-insights">
        <h3>Building Information</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Max Panel Count</span>
            <span class="value">{{
              buildingInsights.solarPotential?.maxArrayPanelsCount || "N/A"
            }}</span>
          </div>
          <div class="info-item">
            <span class="label">Roof Area</span>
            <span class="value">{{
              formatArea(buildingInsights.solarPotential?.maxArrayAreaMeters2)
            }}</span>
          </div>
          <div class="info-item">
            <span class="label">Panel Capacity</span>
            <span class="value"
              >{{
                buildingInsights.solarPotential?.panelCapacityWatts || "N/A"
              }}
              W</span
            >
          </div>
        </div>
      </div>

      <!-- ML Roof Segments (shows when available) -->
      <div v-if="hasMLRoofSegments" class="ml-roof-segments">
        <h3>ML Roof Analysis</h3>
        <p>ML response received with {{ mlSegmentsCount }} segments</p>

        <!-- Visualization mode toggle -->
        <div class="visualization-controls">
          <button
            @click="visualizationMode = 'overlay'"
            :class="{ active: visualizationMode === 'overlay' }"
            class="viz-mode-button"
          >
            Overlay View
          </button>
          <button
            @click="visualizationMode = 'cutout'"
            :class="{ active: visualizationMode === 'cutout' }"
            class="viz-mode-button"
          >
            Cutout View
          </button>
        </div>

        <!-- Actual SVG visualization of ML roof segments -->
        <svg
          width="400"
          height="300"
          style="border: 1px solid #ccc; margin-top: 10px"
          class="segments-svg"
          viewBox="0 0 400 300"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <!-- Define clip paths for segments with obstructions -->
            <template
              v-for="segment in validSegments.filter((s) => s.has_obstruction)"
              :key="`clip-${segment.id}`"
            >
              <clipPath :id="`clip-${segment.id}`">
                <path :d="getSegmentPathWithHoles(segment)" />
              </clipPath>
            </template>
          </defs>

          <!-- Draw each roof segment polygon -->
          <g v-for="segment in validSegments" :key="segment.id">
            <!-- Use clip path for segments with obstructions in cutout mode -->
            <polygon
              v-if="visualizationMode === 'cutout' && segment.has_obstruction"
              :points="formatPolygonPoints(segment.polygon)"
              :fill="getSegmentColor(segment)"
              fill-opacity="0.7"
              stroke="#ffffff"
              stroke-width="2"
              :clip-path="`url(#clip-${segment.id})`"
            />
            <!-- Draw normally for segments without obstructions or in overlay mode -->
            <polygon
              v-else
              :points="formatPolygonPoints(segment.polygon)"
              :fill="getSegmentColor(segment)"
              fill-opacity="0.5"
              stroke="#ffffff"
              stroke-width="2"
            />
          </g>

          <!-- Draw obstructions in overlay mode -->
          <g v-if="visualizationMode === 'overlay'">
            <polygon
              v-for="obstruction in allObstructions"
              :key="`obs-${obstruction.id}`"
              :points="formatPolygonPoints(obstruction.polygon)"
              fill="#e74c3c"
              fill-opacity="0.7"
              stroke="#ff0000"
              stroke-width="1"
            />
          </g>

          <!-- Show dashed outlines around obstructions in cutout mode -->
          <g v-if="visualizationMode === 'cutout'">
            <polygon
              v-for="obstruction in allObstructions"
              :key="`obs-outline-${obstruction.id}`"
              :points="formatPolygonPoints(obstruction.polygon)"
              fill="none"
              stroke="#ff0000"
              stroke-width="1.5"
              stroke-dasharray="3,2"
            />
          </g>
        </svg>

        <div class="segment-legend">
          <div class="legend-item">
            <div class="color-box" style="background-color: #3498db"></div>
            <span>Roof Segment</span>
          </div>
          <div class="legend-item">
            <div class="color-box" style="background-color: #e74c3c"></div>
            <span>Obstruction</span>
          </div>
        </div>

        <div class="ml-data-summary">
          <h4>Segment Data</h4>
          <div class="segment-stats-grid">
            <div
              v-for="segment in validSegments.slice(0, 4)"
              :key="`stat-${segment.id}`"
              class="segment-stat-item"
            >
              <div class="segment-stat-header">{{ segment.id }}</div>
              <div class="segment-stat-value">
                Area: {{ formatArea(segment.area) }}
              </div>
              <div class="segment-stat-value">
                Confidence: {{ (segment.confidence * 100).toFixed(1) }}%
              </div>
              <div
                v-if="segment.has_obstruction"
                class="segment-stat-value obstruction-count"
              >
                Obstructions:
                {{
                  segment.obstruction_count || getObstructionCount(segment.id)
                }}
              </div>
            </div>
          </div>
          <p v-if="validSegments.length > 4" class="more-segments">
            And {{ validSegments.length - 4 }} more segments...
          </p>
        </div>
      </div>

      <!-- Roof segments (shows when available) -->
      <div v-if="hasRoofSegments" class="roof-segments">
        <h3>Roof Analysis</h3>
        <img
          :src="visualizations.roofSegments.visualizations.orientation"
          alt="Roof segments"
          class="segments-image"
        />
        <div class="segments-info">
          <div
            v-for="(segment, index) in visualizations.roofSegments.segments"
            :key="index"
            class="segment-item"
          >
            <span class="segment-id">Segment {{ index + 1 }}</span>
            <span class="segment-area">{{ formatArea(segment.area) }}</span>
            <span class="segment-pitch">{{ segment.pitch }}° pitch</span>
          </div>
        </div>
      </div>

      <!-- Monthly flux (shows when available) -->
      <div v-if="hasMonthlyFlux" class="monthly-flux">
        <h3>Monthly Solar Potential</h3>
        <img
          :src="visualizations.monthlyFlux.dataUrl"
          alt="Monthly solar potential"
          class="flux-image"
        />
        <div class="flux-chart">
          <!-- In a real implementation, we would render a chart here -->
          <div
            v-for="(month, index) in visualizations.monthlyFlux.monthlyData"
            :key="index"
            class="month-bar"
          >
            <span class="month-name">{{ month.month }}</span>
            <div
              class="month-value-bar"
              :style="{ width: `${month.value / 2}px` }"
            ></div>
            <span class="month-value">{{ month.value }} kWh</span>
          </div>
        </div>
      </div>

      <!-- Completion message -->
      <div v-if="isCompleted" class="completion-message">
        <h3>Analysis Complete!</h3>
        <p>
          Solar analysis completed in {{ formatDuration(completionDuration) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

// Hardcoded API URL
const API_BASE_URL = "http://localhost:3000";

// Props
const props = defineProps({
  // Location coordinates for analysis
  location: {
    type: Object,
    required: true,
    validator: (loc) =>
      loc &&
      typeof loc.latitude === "number" &&
      typeof loc.longitude === "number",
  },

  // Auto-start analysis when component mounts
  autoStart: {
    type: Boolean,
    default: true,
  },
});

// Emits
const emit = defineEmits(["progress", "complete", "error"]);

// State
const status = ref("idle"); // idle, connecting, active, completed, error
const progress = ref(0);
const progressMessage = ref("");
const error = ref(null);
const eventSource = ref(null);
const analysisId = ref(null);
const visualizations = ref({});
const buildingInsights = ref(null);
const completionDuration = ref(0);
const visualizationMode = ref("overlay"); // overlay or cutout

// ML specific refs
const mlRoofData = ref(null);
const mlSegmentsCount = ref(0);

// Computed properties
const isConnecting = computed(() => status.value === "connecting");
const isActive = computed(() => status.value === "active");
const isCompleted = computed(() => status.value === "completed");
const hasError = computed(() => status.value === "error");
const isAnalysisRunning = computed(() => isConnecting.value || isActive.value);

// Visualization availability
const hasRgbImage = computed(() => !!visualizations.value.rgb);
const hasRoofSegments = computed(() => !!visualizations.value.roofSegments);
const hasMonthlyFlux = computed(() => !!visualizations.value.monthlyFlux);
const hasMLRoofSegments = computed(() => {
  console.log("Checking hasMLRoofSegments, data:", mlRoofData.value);
  return !!mlRoofData.value;
});

// Convenience getters
const rgbImageUrl = computed(() => {
  console.log("rgb url: ", visualizations.value.rgb);
  return (
    visualizations.value.rgb?.dataUrls.buildingFocus ||
    visualizations.value.rgb?.dataUrls.fullImage ||
    ""
  );
});

// Get valid segments for drawing (with at least 3 points in polygon)
const validSegments = computed(() => {
  if (!mlRoofData.value || !mlRoofData.value.segments) {
    return [];
  }

  return mlRoofData.value.segments.filter(
    (segment) => segment.polygon && segment.polygon.length > 2
  );
});

// Get all valid obstructions
const allObstructions = computed(() => {
  if (!mlRoofData.value || !mlRoofData.value.obstructions) {
    return [];
  }

  return mlRoofData.value.obstructions.filter(
    (obstruction) => obstruction.polygon && obstruction.polygon.length > 2
  );
});

// Get obstructions for a specific segment ID
const getObstructionsForSegment = (segmentId) => {
  if (!mlRoofData.value || !mlRoofData.value.obstructions) {
    return [];
  }

  return mlRoofData.value.obstructions.filter(
    (obstruction) =>
      obstruction.parent_segment === segmentId &&
      obstruction.polygon &&
      obstruction.polygon.length > 2
  );
};

// Count obstructions for a segment
const getObstructionCount = (segmentId) => {
  return getObstructionsForSegment(segmentId).length;
};

// Create an SVG path string that includes holes for obstructions
const getSegmentPathWithHoles = (segment) => {
  if (!segment || !segment.polygon) return "";

  // Main segment path - move to first point, then line to each point
  let path =
    "M " + segment.polygon.map((p) => `${p.x},${p.y}`).join(" L ") + " Z";

  // Add obstruction paths
  const obstructions = getObstructionsForSegment(segment.id);

  for (const obstruction of obstructions) {
    if (obstruction.polygon && obstruction.polygon.length > 2) {
      path +=
        " M " +
        obstruction.polygon.map((p) => `${p.x},${p.y}`).join(" L ") +
        " Z";
    }
  }

  return path;
};

// Format polygon points for SVG
const formatPolygonPoints = (points) => {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
};

// Generate a color for a segment based on its ID
const getSegmentColor = (segment) => {
  // Array of colors for segments
  const colors = [
    "#3498db",
    "#2ecc71",
    "#9b59b6",
    "#f1c40f",
    "#e67e22",
    "#1abc9c",
    "#34495e",
    "#7f8c8d",
  ];

  // Extract a number from the ID to use as an index
  const idNum = parseInt(segment.id.replace(/\D/g, "")) || 0;
  return colors[idNum % colors.length];
};

// Helper function for validating obstructions
const validObstructions = (segment) => {
  if (!segment.obstructions) return [];

  return segment.obstructions.filter(
    (obstruction) => obstruction.polygon && obstruction.polygon.length > 2
  );
};

// Watch for ML data changes
watch(
  visualizations,
  (newVal) => {
    console.log("Visualizations updated:", Object.keys(newVal));
    if (newVal.mlRoofSegments) {
      console.log("ML Roof Segments found:", newVal.mlRoofSegments);
      mlRoofData.value = newVal.mlRoofSegments;

      // Count segments if available
      if (newVal.mlRoofSegments.segments) {
        mlSegmentsCount.value = newVal.mlRoofSegments.segments.length;
        console.log(
          `Found ${mlSegmentsCount.value} ML roof segments in event handler`
        );
      } else {
        console.log("ML data exists but no segments found");
      }
    }
  },
  { deep: true }
);

// Methods
/**
 * Start a new solar analysis
 */
const startAnalysis = async () => {
  try {
    // Reset state
    resetState();

    // Update status
    status.value = "connecting";
    progressMessage.value = "Connecting to server...";

    // Close any existing EventSource
    if (eventSource.value) {
      eventSource.value.close();
      eventSource.value = null;
    }

    // Step 1: Make a POST request to start the analysis and get an analysisId
    const response = await fetch(
      `${API_BASE_URL}/api/v1/solar/comprehensive-analysis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ location: props.location }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to start analysis");
    }

    const data = await response.json();
    analysisId.value = data.analysisId;

    if (!analysisId.value) {
      throw new Error("No analysis ID received from server");
    }

    console.log(`Analysis started with ID: ${analysisId.value}`);

    // Step 2: Connect to the SSE stream with the analysis ID
    const source = new EventSource(
      `${API_BASE_URL}/api/v1/solar/comprehensive-analysis/${analysisId.value}/stream`
    );

    // Set up event listeners
    source.addEventListener("start", handleStartEvent);
    source.addEventListener("progress", handleProgressEvent);
    source.addEventListener("buildingInsights", handleBuildingInsightsEvent);
    source.addEventListener("visualization", handleVisualizationEvent);
    source.addEventListener("complete", handleCompleteEvent);

    // Error handler
    source.onerror = (e) => {
      console.error("SSE connection error:", e);
      handleError("Connection error. Please try again.");
    };

    // Generic message handler (for events without specific types)
    source.onmessage = (event) => {
      console.log("Generic SSE message received:", event.data);
    };

    // Store the EventSource
    eventSource.value = source;

    // Update status
    status.value = "active";
  } catch (err) {
    handleError(err);
  }
};

/**
 * Reset the component state
 */
const resetState = () => {
  status.value = "idle";
  progress.value = 0;
  progressMessage.value = "";
  error.value = null;
  analysisId.value = null;
  visualizations.value = {};
  buildingInsights.value = null;
  completionDuration.value = 0;
  mlRoofData.value = null;
  mlSegmentsCount.value = 0;
  visualizationMode.value = "overlay";
};

/**
 * Retry the analysis after an error
 */
const retry = () => {
  startAnalysis();
};

/**
 * Clean up resources when component is unmounted
 */
const cleanup = () => {
  if (eventSource.value) {
    eventSource.value.close();
    eventSource.value = null;
  }
};

// Event handlers
const handleStartEvent = (event) => {
  const data = JSON.parse(event.data);
  console.log("Analysis started:", data);
  status.value = "active";
  progress.value = 5;
  progressMessage.value = data.message || "Analysis started";
  emit("progress", {
    progress: progress.value,
    message: progressMessage.value,
  });
};

const handleProgressEvent = (event) => {
  const data = JSON.parse(event.data);
  console.log("Progress update:", data);
  progress.value = data.progress || progress.value;
  progressMessage.value = data.message || progressMessage.value;
  emit("progress", {
    progress: progress.value,
    message: progressMessage.value,
  });
};

const handleBuildingInsightsEvent = (event) => {
  const data = JSON.parse(event.data);
  console.log("Building insights received:", data);
  buildingInsights.value = data.data;
  progress.value = data.progress || progress.value;
  progressMessage.value = "Building insights processed";
  emit("progress", {
    progress: progress.value,
    message: progressMessage.value,
  });
};

const handleVisualizationEvent = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Visualization received (${data.type}):`, data);

  // Store the visualization
  visualizations.value[data.type] = data;

  // Special handling for ML data
  if (data.type === "mlRoofSegments") {
    console.log("ML ROOF SEGMENTS RECEIVED:", data);
    mlRoofData.value = data;
    if (data.segments) {
      mlSegmentsCount.value = data.segments.length;
      console.log(
        `Found ${mlSegmentsCount.value} ML roof segments in event handler`
      );
    }
  }

  // Update progress
  progress.value = data.progress || progress.value;
  progressMessage.value = `Processed ${data.type} visualization`;
  emit("progress", {
    progress: progress.value,
    message: progressMessage.value,
  });
};

const handleCompleteEvent = (event) => {
  const data = JSON.parse(event.data);
  console.log("Analysis completed:", data);
  status.value = "completed";
  progress.value = 100;
  progressMessage.value = data.message || "Analysis completed";
  completionDuration.value = data.duration || 0;

  // Close the EventSource
  if (eventSource.value) {
    eventSource.value.close();
    eventSource.value = null;
  }

  emit("complete", {
    visualizations: visualizations.value,
    buildingInsights: buildingInsights.value,
    duration: completionDuration.value,
  });
};

const handleError = (err) => {
  status.value = "error";
  error.value = typeof err === "string" ? err : err.message || "Unknown error";

  // Close the EventSource
  if (eventSource.value) {
    eventSource.value.close();
    eventSource.value = null;
  }

  emit("error", { error: error.value });
};

// Utility functions
const formatArea = (area) => {
  if (!area) return "N/A";
  return `${area.toFixed(1)} m²`;
};

const formatDuration = (ms) => {
  if (!ms) return "N/A";
  const seconds = Math.floor(ms / 1000);
  return `${seconds} seconds`;
};

// Lifecycle hooks
onMounted(() => {
  console.log("Component mounted, autoStart:", props.autoStart);
  if (props.autoStart) {
    startAnalysis();
  }
});

onUnmounted(() => {
  cleanup();
});

// Expose methods for parent component
defineExpose({
  startAnalysis,
  resetState,
});
</script>

<style scoped>
.comprehensive-analysis {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.analysis-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-container {
  height: 24px;
  background-color: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #333;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top-color: #767676;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background-color: #ffebee;
  border-radius: 8px;
}

.error-icon {
  font-size: 2rem;
}

.retry-button {
  padding: 0.5rem 1rem;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.start-container {
  display: flex;
  justify-content: center;
  padding: 2rem;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.visualization-controls {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.viz-mode-button {
  padding: 0.5rem 1rem;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.viz-mode-button.active {
  background-color: #2196f3;
  color: white;
  border-color: #1976d2;
}

.results-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.rgb-container,
.building-insights,
.roof-segments,
.monthly-flux,
.ml-roof-segments {
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.rgb-image,
.segments-image,
.flux-image {
  width: 100%;
  border-radius: 4px;
  margin-top: 0.5rem;
}

.ml-data {
  margin-top: 10px;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}

.segments-svg {
  width: 100%;
  height: auto;
  background-color: #f8f9fa;
}

.segment-legend {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-box {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.ml-data-summary {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.segment-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.segment-stat-item {
  padding: 0.5rem;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.segment-stat-header {
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.segment-stat-value {
  font-size: 0.8rem;
  color: #555;
}

.obstruction-count {
  color: #e74c3c;
  font-weight: 500;
}

.more-segments {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.5rem;
  text-align: center;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 0.85rem;
  color: #666;
}

.value {
  font-size: 1.25rem;
  font-weight: 500;
}

.segments-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.segment-item {
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  padding: 0.75rem;
  border-radius: 4px;
  min-width: 120px;
}

.segment-id {
  font-weight: bold;
}

.flux-chart {
  margin-top: 1rem;
}

.month-bar {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.month-name {
  width: 100px;
}

.month-value-bar {
  height: 20px;
  background-color: #ff9800;
  border-radius: 2px;
  margin-right: 10px;
}

.month-value {
  width: 80px;
  text-align: right;
}

.completion-message {
  padding: 1rem;
  background-color: #e8f5e9;
  border-radius: 8px;
  text-align: center;
}
</style>
