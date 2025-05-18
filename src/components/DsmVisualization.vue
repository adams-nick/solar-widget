<template>
  <div class="dsm-visualization">
    <div class="visualization-header">
      <h2>Elevation Model (DSM)</h2>
      <div class="controls">
        <button @click="toggleBuildingFocus" class="control-button">
          {{ buildingFocus ? "Show Full Area" : "Focus on Building" }}
        </button>
        <button
          v-if="errorMessage"
          @click="fetchDsmData()"
          class="retry-button"
        >
          <span class="retry-icon">↻</span> Retry
        </button>
      </div>
    </div>

    <div class="visualization-content">
      <!-- Loading state -->
      <div v-if="isLoading" class="loading-container">
        <div class="loader"></div>
        <p>Loading elevation model...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="errorMessage" class="error-container">
        <div class="error-icon">!</div>
        <p>{{ errorMessage }}</p>
      </div>

      <!-- Success state -->
      <div v-else-if="displayDsmData" class="image-container">
        <img
          :src="displayDsmData"
          alt="Digital Surface Model of building location"
          class="dsm-image"
        />

        <!-- Elevation Legend (DSM specific) -->
        <div class="elevation-legend" v-if="elevationRange">
          <div class="legend-gradient"></div>
          <div class="legend-labels">
            <span class="legend-min">{{ elevationRange.min }}m</span>
            <span class="legend-max">{{ elevationRange.max }}m</span>
          </div>
          <div class="legend-title">Elevation (meters)</div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <p>No elevation model available. Click "Fetch DSM" to load.</p>
        <button @click="fetchDsmData()" class="primary-button">
          Fetch DSM
        </button>
      </div>
    </div>
  </div>
  <button @click="emitGoBack()">Go back</button>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";

// Props
const props = defineProps({
  solarData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["goBack"]);

// Reactive state
const buildingFocusData = ref(null);
const fullImageData = ref(null);
const isLoading = ref(false);
const errorMessage = ref("");
const buildingFocus = ref(true);
const elevationRange = ref(null);

// Computed properties to determine which data URL to display
const displayDsmData = computed(() => {
  return buildingFocus.value ? buildingFocusData.value : fullImageData.value;
});

const location = computed(() => {
  // First check solarData.data.center
  if (props.solarData?.buildingInsights?.center) {
    return props.solarData.buildingInsights.center;
  }
  // Fall back to solarData.center
  if (props.solarData?.center) {
    return props.solarData.center;
  }
  // Default
  return { latitude: 37.7749, longitude: -122.4194 };
});

// Methods
const emitGoBack = () => {
  emit("goBack");
};

const fetchDsmData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = "";

    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/v1/data-layers/dsm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: {
          latitude: location.value.latitude,
          longitude: location.value.longitude,
        },
        radius: 50,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `Server returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("dsm data: ", data);

    if (
      data.dataUrls &&
      (data.dataUrls.buildingFocus || data.dataUrls.fullImage)
    ) {
      // Store both datasets
      buildingFocusData.value = data.dataUrls.buildingFocus;
      fullImageData.value = data.dataUrls.fullImage;

      // Store elevation range for the legend
      if (data.metadata && data.metadata.elevationRange) {
        elevationRange.value = data.metadata.elevationRange;
      }
    } else {
      throw new Error("No elevation model available for this location");
    }
  } catch (error) {
    console.error("Error fetching DSM data:", error);
    errorMessage.value = error.message || "Failed to load elevation model";
    buildingFocusData.value = null;
    fullImageData.value = null;
  } finally {
    isLoading.value = false;
  }
};

const toggleBuildingFocus = () => {
  buildingFocus.value = !buildingFocus.value;
  // No need to re-fetch data with new building focus setting
};

// Lifecycle hooks and watchers
onMounted(() => {
  if (props.solarData) {
    fetchDsmData();
  }
});

watch(
  () => props.solarData,
  () => {
    if (props.solarData) {
      fetchDsmData();
    }
  },
  { deep: true }
);
</script>

<style scoped>
.dsm-visualization {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background-color: white;
}

.visualization-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.visualization-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.controls {
  display: flex;
  gap: 0.5rem;
}

.control-button,
.retry-button,
.primary-button {
  background-color: #2196f3; /* Blue for DSM instead of green for RGB */
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-weight: 500;
  font-size: 0.875rem;
}

.control-button:hover,
.primary-button:hover {
  background-color: #1976d2;
}

.retry-button {
  background-color: #ff9800;
}

.retry-button:hover {
  background-color: #f57c00;
}

.retry-icon {
  font-weight: bold;
  margin-right: 0.25rem;
}

.visualization-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background-color: #fafafa;
  overflow: hidden;
  position: relative;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.dsm-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* DSM-specific styles for elevation legend */
.elevation-legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  width: 150px;
}

.legend-gradient {
  height: 15px;
  width: 100%;
  background: linear-gradient(
    to right,
    #3949ab,
    #81d4fa,
    #66bb6a,
    #ffe082,
    #e53935
  );
  border-radius: 3px;
  margin-bottom: 5px;
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #333;
}

.legend-title {
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  margin-top: 5px;
  color: #333;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.loader {
  border: 5px solid #f3f3f3;
  border-top: 5px solid #2196f3; /* Blue loader for DSM */
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: #d32f2f;
  text-align: center;
  max-width: 400px;
}

.error-icon {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #ffcdd2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d32f2f;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;
  color: #757575;
}
</style>
