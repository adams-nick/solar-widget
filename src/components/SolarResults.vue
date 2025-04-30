<script setup>
import { ref, onMounted, computed } from "vue";

const props = defineProps({
  solarData: {
    type: Object,
    required: true,
  },
});

// Extract data from the API response
const solarPotential = computed(() => {
  return props.solarData.data.solarPotential || {};
});

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
</script>

<template>
  <div class="solar-results">
    <h3>Solar Potential Results</h3>

    <div v-if="solarData && solarData.data">
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

      <div class="cta-panel">
        <button class="cta-button">Request Detailed Quote</button>
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

    h4 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #2e7d32;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 8px;
    }

    p {
      margin: 8px 0;
    }
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

    &:hover {
      background-color: #1b5e20;
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
