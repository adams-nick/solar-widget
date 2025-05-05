<template>
  <div class="solar-flux-visualization">
    <div class="visualization-header">
      <h2>Solar Potential Visualization</h2>
      <div class="view-toggle">
        <button @click="toggleView" class="toggle-button">
          Switch to {{ isMonthlyView ? "Annual" : "Monthly" }} View
        </button>
      </div>
    </div>

    <!-- Conditional rendering of visualization components -->
    <monthly-flux-visualization
      v-if="isMonthlyView"
      :location="location"
      :monthly-data="monthlyFluxData"
      :is-loading="isLoading"
      :error-message="errorMessage"
      @fetch-data="fetchMonthlyFluxData"
    />

    <annual-flux-visualization
      v-else
      :location="location"
      :annual-data="annualFluxData"
      :is-loading="isLoading"
      :error-message="errorMessage"
      @fetch-data="fetchAnnualFluxData"
    />

    <flux-legend />
    <button @click="emitRgbLayer()">Show Aerial Image</button>
  </div>
</template>

<script>
import MonthlyFluxVisualization from "./MonthlyFluxVisualization.vue";
import AnnualFluxVisualization from "./AnnualFluxVisualization.vue";
import FluxLegend from "./FluxLegend.vue";

export default {
  name: "SolarFluxVisualization",
  components: {
    MonthlyFluxVisualization,
    AnnualFluxVisualization,
    FluxLegend,
  },
  props: {
    solarData: {
      type: Object,
      required: true,
    },
  },
  emits: ["show-rgb-layer"],
  data() {
    return {
      isMonthlyView: true,
      monthlyFluxData: null,
      annualFluxData: null,
      isLoading: false,
      errorMessage: "",
    };
  },
  computed: {
    location() {
      // First check solarData.data.center
      if (this.solarData && this.solarData.data && this.solarData.data.center) {
        return this.solarData.data.center;
      }
      // Fall back to solarData.center
      if (this.solarData && this.solarData.center) {
        return this.solarData.center;
      }
      // Default
      return { latitude: 37.7749, longitude: -122.4194 };
    },
  },
  watch: {
    solarData: {
      immediate: true,
      handler() {
        this.fetchData();
      },
    },
  },
  methods: {
    emitRgbLayer() {
      this.$emit("show-rgb-layer");
    },

    toggleView() {
      this.isMonthlyView = !this.isMonthlyView;
      this.errorMessage = "";
      this.fetchData();
    },

    fetchData() {
      if (this.isMonthlyView) {
        this.fetchMonthlyFluxData();
      } else {
        this.fetchAnnualFluxData();
      }
    },

    async fetchMonthlyFluxData(forceSynthetic = false) {
      try {
        this.isLoading = true;
        this.errorMessage = "";

        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/api/v1/data-layers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: {
              latitude: this.location.latitude,
              longitude: this.location.longitude,
            },
            radius: 50,
            layerType: "monthlyFlux",
            includeMask: true,
            forceSynthetic,
          }),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(
            `Server returned ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.visualizations && Array.isArray(data.visualizations)) {
          this.monthlyFluxData = data.visualizations;
        } else if (data.monthlyDataUrls && data.monthlyDataUrls.length > 0) {
          // Handle legacy response format
          this.monthlyFluxData = data.monthlyDataUrls;
        } else {
          throw new Error("No solar flux data available for this location");
        }
      } catch (error) {
        console.error("Error fetching monthly flux data:", error);
        this.errorMessage =
          error.message || "Failed to load solar visualization data";
      } finally {
        this.isLoading = false;
      }
    },

    async fetchAnnualFluxData(forceSynthetic = false) {
      try {
        this.isLoading = true;
        this.errorMessage = "";

        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/api/v1/data-layers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: {
              latitude: this.location.latitude,
              longitude: this.location.longitude,
            },
            radius: 50,
            layerType: "annualFlux",
            includeMask: true,
            forceSynthetic,
          }),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(
            `Server returned ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.visualizations && data.visualizations.rawFlux) {
          this.annualFluxData = data.visualizations.rawFlux;
        } else if (data.dataUrl) {
          // Handle legacy response format
          this.annualFluxData = data.dataUrl;
        } else {
          throw new Error(
            "No annual solar flux data available for this location"
          );
        }
      } catch (error) {
        console.error("Error fetching annual flux data:", error);
        this.errorMessage =
          error.message || "Failed to load annual solar visualization data";
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.solar-flux-visualization {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.visualization-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.toggle-button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-weight: bold;
}

.toggle-button:hover {
  background-color: #388e3c;
}
</style>
