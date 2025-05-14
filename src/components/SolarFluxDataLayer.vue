<template>
  <div class="solar-flux-visualization">
    <div class="visualization-header">
      <h2>Solar Potential Visualization</h2>
      <div class="controls">
        <button @click="toggleView" class="toggle-button">
          Switch to {{ isMonthlyView ? "Annual" : "Monthly" }} View
        </button>
        <button @click="toggleBuildingFocus" class="focus-button">
          {{ buildingFocus ? "Show Full Area" : "Focus on Building" }}
        </button>
      </div>
    </div>

    <!-- Conditional rendering of visualization components -->
    <monthly-flux-visualization
      v-if="isMonthlyView"
      :location="location"
      :monthly-data="displayMonthlyFluxData"
      :is-loading="isLoading"
      :error-message="errorMessage"
      @fetch-data="fetchMonthlyFluxData"
    />

    <annual-flux-visualization
      v-else
      :location="location"
      :annual-data="displayAnnualFluxData"
      :is-loading="isLoading"
      :error-message="errorMessage"
      @fetch-data="fetchAnnualFluxData"
    />

    <flux-legend />
    <button @click="emitGoBack()">Go Back</button>
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
  emits: ["goBack"],
  data() {
    return {
      isMonthlyView: true,
      // Store both building focus and full image versions
      monthlyFluxData: {
        buildingFocus: null,
        fullImage: null,
      },
      annualFluxData: {
        buildingFocus: null,
        fullImage: null,
      },
      buildingFocus: true,
      isLoading: false,
      errorMessage: "",
    };
  },
  computed: {
    location() {
      // First check solarData.data.center
      if (
        this.solarData &&
        this.solarData.buildingInsights &&
        this.solarData.buildingInsights.center
      ) {
        return this.solarData.buildingInsights.center;
      }
      // Fall back to solarData.center
      if (this.solarData && this.solarData.center) {
        return this.solarData.center;
      }
      // Default
      return { latitude: 37.7749, longitude: -122.4194 };
    },
    // Determine which dataset to display based on building focus toggle
    displayMonthlyFluxData() {
      if (!this.monthlyFluxData) return null;
      return this.buildingFocus
        ? this.monthlyFluxData.buildingFocus
        : this.monthlyFluxData.fullImage;
    },
    displayAnnualFluxData() {
      if (!this.annualFluxData) return null;
      return this.buildingFocus
        ? this.annualFluxData.buildingFocus
        : this.annualFluxData.fullImage;
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
    emitGoBack() {
      this.$emit("goBack");
    },

    toggleView() {
      this.isMonthlyView = !this.isMonthlyView;
      this.errorMessage = "";
      this.fetchData();
    },

    toggleBuildingFocus() {
      this.buildingFocus = !this.buildingFocus;
      // No need to re-fetch data as we already have both versions
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
        console.log("monthly data: ", data);

        if (
          data.monthlyDataUrls &&
          (data.monthlyDataUrls.buildingFocus || data.monthlyDataUrls.fullImage)
        ) {
          // Only handle new response format with both building focus and full image
          this.monthlyFluxData = {
            buildingFocus: data.monthlyDataUrls.buildingFocus || [],
            fullImage: data.monthlyDataUrls.fullImage || [],
          };

          // If one dataset is missing, use the other for both
          if (
            !this.monthlyFluxData.buildingFocus.length &&
            this.monthlyFluxData.fullImage.length
          ) {
            this.monthlyFluxData.buildingFocus = this.monthlyFluxData.fullImage;
          } else if (
            !this.monthlyFluxData.fullImage.length &&
            this.monthlyFluxData.buildingFocus.length
          ) {
            this.monthlyFluxData.fullImage = this.monthlyFluxData.buildingFocus;
          }
        } else {
          throw new Error("No solar flux data available for this location");
        }
      } catch (error) {
        console.error("Error fetching monthly flux data:", error);
        this.errorMessage =
          error.message || "Failed to load solar visualization data";
        this.monthlyFluxData = {
          buildingFocus: null,
          fullImage: null,
        };
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
        console.log("annual data: ", data);

        if (
          data.dataUrls &&
          (data.dataUrls.buildingFocus || data.dataUrls.fullImage)
        ) {
          // Only handle new response format with both building focus and full image
          this.annualFluxData = {
            buildingFocus: data.dataUrls.buildingFocus || null,
            fullImage: data.dataUrls.fullImage || null,
          };

          // If one dataset is missing, use the other for both
          if (
            !this.annualFluxData.buildingFocus &&
            this.annualFluxData.fullImage
          ) {
            this.annualFluxData.buildingFocus = this.annualFluxData.fullImage;
          } else if (
            !this.annualFluxData.fullImage &&
            this.annualFluxData.buildingFocus
          ) {
            this.annualFluxData.fullImage = this.annualFluxData.buildingFocus;
          }
        } else {
          throw new Error(
            "No annual solar flux data available for this location"
          );
        }
      } catch (error) {
        console.error("Error fetching annual flux data:", error);
        this.errorMessage =
          error.message || "Failed to load annual solar visualization data";
        this.annualFluxData = {
          buildingFocus: null,
          fullImage: null,
        };
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

.controls {
  display: flex;
  gap: 0.5rem;
}

.toggle-button,
.focus-button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-weight: bold;
}

.toggle-button:hover,
.focus-button:hover {
  background-color: #388e3c;
}
</style>
