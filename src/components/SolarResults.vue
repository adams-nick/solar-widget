<script setup>
import { ref, onMounted, computed, watch } from "vue";

const props = defineProps({
  solarData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["showSolarLayer", "segmentSelected"]);

// Active tab state
const activeTab = ref("summary");

// Selected roof segment
const selectedSegmentId = ref(null);

// Color mode for roof segment visualization
const colorMode = ref("suitability");

// Extract data from the API response
const solarPotential = computed(() => {
  return props.solarData.data.solarPotential || {};
});

// Check if roof segments are available
const hasRoofSegments = computed(() => {
  return props.solarData.roofSegments && !props.solarData.roofSegments.error;
});

// Get roof segments data
const roofSegments = computed(() => {
  if (hasRoofSegments.value) {
    return props.solarData.roofSegments.data || [];
  }
  return [];
});

// Get the currently selected visualization URL based on color mode
const currentVisualization = computed(() => {
  if (hasRoofSegments.value && props.solarData.roofSegments.visualizations) {
    return props.solarData.roofSegments.visualizations[colorMode.value] || "";
  }
  return "";
});

// Sort segments by suitability (best first)
const sortedSegments = computed(() => {
  if (!roofSegments.value) return [];

  return [...roofSegments.value].sort((a, b) => {
    return b.suitability - a.suitability;
  });
});

// Function to handle segment selection
function selectSegment(segmentId) {
  selectedSegmentId.value = segmentId;
  emit("segmentSelected", segmentId);
}

// Function to change color mode
function changeColorMode(mode) {
  colorMode.value = mode;
}

// Function to show solar layer
function requestQuote() {
  emit("showSolarLayer");
}

// Calculate financial summaries
const financialSummary = computed(() => {
  const solarPotential = props.solarData.data.solarPotential;
  if (!solarPotential) return null;

  // Find the best panel configuration
  let bestConfig = null;
  let maxPanels = 0;

  if (solarPotential.solarPanelConfigs) {
    solarPotential.solarPanelConfigs.forEach((config) => {
      if (config.panelsCount > maxPanels) {
        maxPanels = config.panelsCount;
        bestConfig = config;
      }
    });
  }

  // Find financial analysis for best config
  let financialAnalysis = null;
  if (solarPotential.financialAnalyses && bestConfig) {
    financialAnalysis = solarPotential.financialAnalyses.find(
      (analysis) =>
        analysis.panelConfigIndex ===
        solarPotential.solarPanelConfigs.indexOf(bestConfig)
    );
  }

  return {
    bestConfig,
    financialAnalysis,
    maxCapacity: bestConfig
      ? (bestConfig.panelsCount * solarPotential.panelCapacityWatts) / 1000
      : 0,
    yearlyProduction: bestConfig ? bestConfig.yearlyEnergyDcKwh * 0.85 : 0, // Apply DC to AC conversion
  };
});

// Get segment stats for a specific segment
function getSegmentStats(segment) {
  if (!segment) return {};

  const stats = {
    area: segment.area.toFixed(1),
    orientation: getOrientationName(segment.azimuth),
    pitch: segment.pitch.toFixed(1),
    suitability: (segment.suitability * 100).toFixed(0),
  };

  if (segment.sunshineHours) {
    stats.sunshineHours = segment.sunshineHours.median.toFixed(0);
  }

  return stats;
}

// Convert azimuth degrees to compass direction
function getOrientationName(azimuth) {
  const directions = [
    "North",
    "North-Northeast",
    "Northeast",
    "East-Northeast",
    "East",
    "East-Southeast",
    "Southeast",
    "South-Southeast",
    "South",
    "South-Southwest",
    "Southwest",
    "West-Southwest",
    "West",
    "West-Northwest",
    "Northwest",
    "North-Northwest",
    "North",
  ];

  // Convert azimuth to index (0-16)
  const index = Math.round(azimuth / 22.5) % 16;
  return directions[index];
}

// Get suitability class based on score
function getSuitabilityClass(score) {
  if (score >= 0.8) return "excellent";
  if (score >= 0.6) return "good";
  if (score >= 0.4) return "fair";
  if (score >= 0.2) return "poor";
  return "very-poor";
}

// Get estimated panel count for a segment
function getEstimatedPanelCount(segment) {
  if (!segment || !solarPotential.value) return 0;

  // Average panel area based on Google panel dimensions
  const panelWidth = solarPotential.value.panelWidthMeters || 1.045;
  const panelHeight = solarPotential.value.panelHeightMeters || 1.879;
  const panelArea = panelWidth * panelHeight;

  // Allow for spacing between panels
  const utilizationFactor = 0.9;

  // Calculate number of panels that could fit
  return Math.floor((segment.area * utilizationFactor) / panelArea);
}

// Calculate potential energy for a segment
function getSegmentEnergy(segment) {
  if (!segment || !solarPotential.value) return 0;

  const panelCount = getEstimatedPanelCount(segment);
  const panelCapacity = solarPotential.value.panelCapacityWatts || 400;
  const systemCapacity = (panelCount * panelCapacity) / 1000; // in kW

  // Estimate annual production based on sunshine hours and typical efficiency factors
  const sunshineHours = segment.sunshineHours?.median || 1500;
  const performanceRatio = 0.75; // Typical system losses

  return systemCapacity * sunshineHours * performanceRatio;
}
</script>

<template>
  <div class="solar-results">
    <h3>Solar Potential Results</h3>

    <div v-if="solarData && solarData.data">
      <!-- Tab navigation -->
      <div class="tab-navigation">
        <button
          :class="['tab-button', { active: activeTab === 'summary' }]"
          @click="activeTab = 'summary'"
        >
          Summary
        </button>
        <button
          :class="['tab-button', { active: activeTab === 'roof' }]"
          @click="activeTab = 'roof'"
          :disabled="!hasRoofSegments"
        >
          Roof Analysis
        </button>
      </div>

      <!-- Summary Tab Content -->
      <div v-if="activeTab === 'summary'" class="tab-content">
        <div class="summary-panel">
          <div class="summary-item">
            <h4>Building Information</h4>
            <p>
              <strong>Location:</strong>
              {{ solarData.data.center.latitude.toFixed(6) }},
              {{ solarData.data.center.longitude.toFixed(6) }}
            </p>
            <p v-if="solarData.data.postalCode">
              <strong>Area:</strong> {{ solarData.data.postalCode }},
              {{ solarData.data.administrativeArea }}
            </p>
          </div>

          <div class="summary-item" v-if="solarPotential">
            <h4>Solar Potential</h4>
            <p>
              <strong>Max System Size:</strong>
              {{
                (
                  (solarPotential.maxArrayPanelsCount *
                    solarPotential.panelCapacityWatts) /
                  1000
                ).toFixed(2)
              }}
              kW
            </p>
            <p>
              <strong>Annual Sunshine:</strong>
              {{ solarPotential.maxSunshineHoursPerYear }} hours/year
            </p>
            <p>
              <strong>Roof Area:</strong>
              {{ solarPotential.maxArrayAreaMeters2.toFixed(2) }} m²
            </p>
          </div>

          <div
            class="summary-item"
            v-if="financialSummary && financialSummary.bestConfig"
          >
            <h4>Recommended System</h4>
            <p>
              <strong>System Size:</strong>
              {{ financialSummary.maxCapacity.toFixed(2) }} kW
            </p>
            <p>
              <strong>Panel Count:</strong>
              {{ financialSummary.bestConfig.panelsCount }} panels
            </p>
            <p>
              <strong>Annual Production:</strong>
              {{ financialSummary.yearlyProduction.toFixed(2) }} kWh
            </p>
          </div>

          <div
            class="summary-item"
            v-if="financialSummary && financialSummary.financialAnalysis"
          >
            <h4>Financial Analysis</h4>
            <p>
              <strong>Installation Cost:</strong> ${{
                financialSummary.financialAnalysis.cashPurchaseSavings
                  ?.upfrontCost.units
              }}
            </p>
            <p>
              <strong>Payback Period:</strong>
              {{
                financialSummary.financialAnalysis.cashPurchaseSavings?.paybackYears.toFixed(
                  1
                )
              }}
              years
            </p>
            <p>
              <strong>20-Year Savings:</strong> ${{
                financialSummary.financialAnalysis.cashPurchaseSavings?.savings
                  .savingsYear20.units
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Roof Analysis Tab Content -->
      <div v-if="activeTab === 'roof'" class="tab-content">
        <div v-if="hasRoofSegments" class="roof-analysis">
          <div class="roof-visualization">
            <div class="visualization-controls">
              <div class="color-controls">
                <label>Color by:</label>
                <div class="color-buttons">
                  <button
                    :class="[
                      'color-button',
                      { active: colorMode === 'suitability' },
                    ]"
                    @click="changeColorMode('suitability')"
                  >
                    Suitability
                  </button>
                  <button
                    :class="[
                      'color-button',
                      { active: colorMode === 'orientation' },
                    ]"
                    @click="changeColorMode('orientation')"
                  >
                    Orientation
                  </button>
                </div>
              </div>
            </div>

            <div class="visualization-container">
              <img
                v-if="currentVisualization"
                :src="currentVisualization"
                alt="Roof segment visualization"
                class="roof-image"
              />
              <div v-else class="visualization-placeholder">
                Visualization not available
              </div>
            </div>

            <div class="visualization-caption">
              <p>
                {{
                  colorMode === "suitability"
                    ? "Solar suitability"
                    : "Roof orientation"
                }}
                visualization
              </p>
              <p class="help-text">
                Click on a segment in the list to view details
              </p>
            </div>
          </div>

          <div class="roof-segments">
            <h4>Roof Segments</h4>
            <div class="segments-list">
              <div
                v-for="segment in sortedSegments"
                :key="segment.id"
                :class="[
                  'segment-item',
                  { active: selectedSegmentId === segment.id },
                ]"
                @click="selectSegment(segment.id)"
              >
                <div class="segment-header">
                  <span class="segment-id">Segment {{ segment.id + 1 }}</span>
                  <span
                    :class="[
                      'suitability-badge',
                      getSuitabilityClass(segment.suitability),
                    ]"
                  >
                    {{ (segment.suitability * 100).toFixed(0) }}%
                  </span>
                </div>

                <div class="segment-details">
                  <p><strong>Area:</strong> {{ segment.area.toFixed(1) }} m²</p>
                  <p>
                    <strong>Orientation:</strong>
                    {{ getOrientationName(segment.azimuth) }}
                  </p>
                  <p><strong>Pitch:</strong> {{ segment.pitch.toFixed(1) }}°</p>
                  <p v-if="segment.sunshineHours">
                    <strong>Annual Sunshine:</strong>
                    {{ segment.sunshineHours.median.toFixed(0) }} hours
                  </p>
                  <p>
                    <strong>Estimated Panel Capacity:</strong>
                    {{ getEstimatedPanelCount(segment) }} panels
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="segment-details-panel" v-if="selectedSegmentId !== null">
            <h4>Selected Segment Details</h4>
            <div v-if="roofSegments.find((s) => s.id === selectedSegmentId)">
              {{
                getSegmentStats(
                  roofSegments.find((s) => s.id === selectedSegmentId)
                )
              }}
            </div>
          </div>
        </div>

        <div v-else class="roof-error">
          <p>Roof segment analysis is not available for this building.</p>
          <p>
            This may be due to insufficient imagery quality or building
            recognition issues.
          </p>
        </div>
      </div>

      <div class="cta-panel">
        <button class="cta-button" @click="requestQuote">
          Request Detailed Quote
        </button>
      </div>
    </div>

    <div v-else class="error-message">No solar data available</div>
  </div>
</template>

<style lang="scss" scoped>
.solar-results {
  padding: 16px;

  h3 {
    margin-bottom: 16px;
    text-align: center;
    font-size: 1.5rem;
    color: #1b5e20;
  }

  .tab-navigation {
    display: flex;
    margin-bottom: 16px;
    border-bottom: 2px solid #e0e0e0;
  }

  .tab-button {
    padding: 10px 20px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    color: #757575;
    transition: all 0.2s ease;

    &.active {
      color: #2e7d32;
      border-bottom: 2px solid #2e7d32;
      margin-bottom: -2px;
    }

    &:disabled {
      color: #bdbdbd;
      cursor: not-allowed;
    }
  }

  .tab-content {
    margin-bottom: 20px;
  }

  .summary-panel {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .summary-item {
    background-color: #f5f5f5;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    h4 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #2e7d32;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 8px;
    }

    p {
      margin: 8px 0;
      line-height: 1.4;
    }
  }

  .roof-analysis {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 20px;
    margin-bottom: 24px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .roof-visualization {
    background-color: #f5f5f5;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .visualization-controls {
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    label {
      font-weight: 500;
      margin-right: 10px;
    }
  }

  .color-controls {
    display: flex;
    align-items: center;
  }

  .color-buttons {
    display: flex;
    gap: 10px;
  }

  .color-button {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;

    &.active {
      background-color: #2e7d32;
      color: white;
      border-color: #2e7d32;
    }
  }

  .visualization-container {
    width: 100%;
    height: 300px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #e8f5e9;
    border-radius: 8px;
    margin-bottom: 12px;
    overflow: hidden;
  }

  .roof-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .visualization-placeholder {
    color: #757575;
    text-align: center;
    padding: 20px;
  }

  .visualization-caption {
    text-align: center;
    color: #616161;
    font-size: 0.9rem;

    p {
      margin: 4px 0;
    }

    .help-text {
      font-style: italic;
      font-size: 0.85rem;
    }
  }

  .roof-segments {
    h4 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #2e7d32;
    }
  }

  .segments-list {
    max-height: 350px;
    overflow-y: auto;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }

  .segment-item {
    padding: 12px;
    border-bottom: 1px solid #e0e0e0;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: #f5f5f5;
    }

    &.active {
      background-color: #e8f5e9;
      border-left: 4px solid #2e7d32;
    }
  }

  .segment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .segment-id {
    font-weight: 600;
    color: #424242;
  }

  .suitability-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;

    &.excellent {
      background-color: #4caf50;
      color: white;
    }

    &.good {
      background-color: #8bc34a;
      color: white;
    }

    &.fair {
      background-color: #ffc107;
      color: #424242;
    }

    &.poor {
      background-color: #ff9800;
      color: white;
    }

    &.very-poor {
      background-color: #f44336;
      color: white;
    }
  }

  .segment-details {
    font-size: 0.9rem;

    p {
      margin: 4px 0;
    }
  }

  .segment-details-panel {
    margin-top: 20px;
    padding: 16px;
    background-color: #f5f5f5;
    border-radius: 8px;

    h4 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #2e7d32;
    }
  }

  .roof-error {
    text-align: center;
    padding: 24px;
    background-color: #f5f5f5;
    border-radius: 8px;
    color: #757575;
  }

  .cta-panel {
    text-align: center;
    margin-top: 24px;
  }

  .cta-button {
    background-color: #2e7d32;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;

    &:hover {
      background-color: #1b5e20;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
  }

  .error-message {
    color: #d32f2f;
    padding: 16px;
    background-color: #ffebee;
    border-radius: 4px;
    text-align: center;
  }
}
</style>
