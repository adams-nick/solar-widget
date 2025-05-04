<template>
  <div class="solar-flux-visualization">
    <div class="visualization-header">
      <h2>
        {{
          isMonthlyView ? "Monthly Solar Potential" : "Annual Solar Potential"
        }}
      </h2>
      <div class="view-toggle">
        <button @click="toggleView" class="toggle-button">
          Switch to {{ isMonthlyView ? "Annual" : "Monthly" }} View
        </button>
      </div>
      <div v-if="isMonthlyView" class="month-display">
        <span class="month-label">{{ currentMonthName }}</span>
      </div>
    </div>

    <div class="flux-container" ref="fluxContainer">
      <img
        v-if="dataLoaded && currentFluxImageUrl"
        :src="currentFluxImageUrl"
        class="flux-image"
        alt="Solar flux visualization"
      />

      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div>Loading solar data...</div>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>

    <div class="visualization-controls" v-if="isMonthlyView">
      <button
        @click="toggleAnimation"
        class="control-button"
        :disabled="!dataLoaded || isLoading"
      >
        {{ isAnimating ? "Pause" : "Play" }} Animation
      </button>
      <div class="month-slider">
        <input
          type="range"
          min="0"
          max="11"
          v-model.number="currentMonth"
          @input="updateVisualization"
          :disabled="isAnimating || !dataLoaded || isLoading"
        />
      </div>
    </div>

    <div class="legend">
      <div class="legend-title">Solar Energy Potential</div>
      <div class="legend-gradient"></div>
      <div class="legend-labels">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "SolarFluxDataLayer",
  props: {
    solarData: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      currentMonth: 0,
      isAnimating: false,
      animationInterval: null,
      monthlyFluxData: null,
      annualFluxData: null,
      currentFluxImageUrl: null,
      isLoading: false,
      errorMessage: "",
      dataLoaded: false,
      isMonthlyView: true,
      months: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
    };
  },
  computed: {
    currentMonthName() {
      return this.months[this.currentMonth];
    },
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
      return { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
    },
  },
  watch: {
    solarData: {
      immediate: true,
      handler(newData) {
        console.log("solarData changed:", newData);
        this.fetchFluxData();
      },
    },
  },
  mounted() {
    console.log("SolarFluxDataLayer mounted, solarData:", this.solarData);
    this.fetchFluxData();
  },
  beforeUnmount() {
    this.stopAnimation();
  },
  methods: {
    async fetchFluxData(forceSynthetic = false) {
      if (this.isMonthlyView) {
        this.fetchMonthlyFluxData(forceSynthetic);
      } else {
        this.fetchAnnualFluxData(forceSynthetic);
      }
    },

    async fetchMonthlyFluxData(forceSynthetic = false) {
      try {
        this.isLoading = true;
        this.errorMessage = "";

        console.log("Fetching monthly flux data from server...");

        // Get the base URL - use window.location in browser environments
        const baseUrl = window.location.origin;

        console.log(`Using base URL: ${baseUrl} for API request`);

        // Make a request to our server endpoint with full URL
        const response = await fetch(`${baseUrl}/api/v1/data-layers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
          console.error(
            `Error response: ${response.status} ${response.statusText}`
          );
          throw new Error(
            `Server returned ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("Received monthly data from server:", data);

        if (data.monthlyDataUrls && data.monthlyDataUrls.length > 0) {
          console.log(
            `Loaded ${data.monthlyDataUrls.length} monthly visualizations`
          );
          this.monthlyFluxData = data.monthlyDataUrls;
          this.dataLoaded = true;

          // Update visualization with the new data
          this.updateVisualization();
        } else {
          console.error("No monthly data URLs returned from server");
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

        console.log("Fetching annual flux data from server...");

        // Get the base URL - use window.location in browser environments
        const baseUrl = window.location.origin;

        console.log(`Using base URL: ${baseUrl} for API request`);

        // Make a request to our server endpoint for annual flux
        const response = await fetch(`${baseUrl}/api/v1/data-layers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location: {
              latitude: this.location.latitude,
              longitude: this.location.longitude,
            },
            radius: 50,
            layerType: "annualFlux", // Changed to annualFlux
            includeMask: true,
            forceSynthetic,
          }),
          credentials: "include",
        });

        if (!response.ok) {
          console.error(
            `Error response: ${response.status} ${response.statusText}`
          );
          throw new Error(
            `Server returned ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("Received annual data from server:", data);

        if (data.dataUrl) {
          console.log("Loaded annual visualization");
          this.annualFluxData = data.dataUrl;
          this.dataLoaded = true;

          // Update visualization with the new data
          this.updateVisualization();
        } else {
          console.error("No annual data URL returned from server");
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

    updateVisualization() {
      if (this.isMonthlyView) {
        this.updateMonthlyVisualization();
      } else {
        this.updateAnnualVisualization();
      }
    },

    updateMonthlyVisualization() {
      if (!this.monthlyFluxData || !this.dataLoaded) {
        console.log("Skipping monthly visualization update - missing data:", {
          hasMonthlyFluxData: !!this.monthlyFluxData,
          dataLoaded: this.dataLoaded,
        });
        return;
      }

      try {
        console.log(
          "Updating monthly visualization for month:",
          this.currentMonth
        );

        // Simply set the current flux image URL - these are base64 data URIs
        this.currentFluxImageUrl = this.monthlyFluxData[this.currentMonth];

        if (!this.currentFluxImageUrl) {
          console.error("No image URL for current month");
          this.errorMessage = "Missing data for current month";
        } else {
          console.log(
            "Updated visualization for month:",
            this.currentMonthName
          );
          this.errorMessage = ""; // Clear any previous errors
        }
      } catch (error) {
        console.error("Error updating monthly visualization:", error);
        this.errorMessage = "Failed to display visualization: " + error.message;

        // If visualization fails, try using synthetic visualization
        if (!forceSynthetic) {
          console.log(
            "Error in visualization, requesting synthetic version..."
          );
          this.fetchMonthlyFluxData(true);
        }
      }
    },

    updateAnnualVisualization() {
      if (!this.annualFluxData || !this.dataLoaded) {
        console.log("Skipping annual visualization update - missing data:", {
          hasAnnualFluxData: !!this.annualFluxData,
          dataLoaded: this.dataLoaded,
        });
        return;
      }

      try {
        console.log("Updating annual visualization");

        // Set the annual flux image URL
        this.currentFluxImageUrl = this.annualFluxData;

        if (!this.currentFluxImageUrl) {
          console.error("No image URL for annual visualization");
          this.errorMessage = "Missing data for annual visualization";
        } else {
          console.log("Updated annual visualization");
          this.errorMessage = ""; // Clear any previous errors
        }
      } catch (error) {
        console.error("Error updating annual visualization:", error);
        this.errorMessage = "Failed to display visualization: " + error.message;

        // If visualization fails, try using synthetic visualization
        if (!forceSynthetic) {
          console.log(
            "Error in visualization, requesting synthetic version..."
          );
          this.fetchAnnualFluxData(true);
        }
      }
    },

    toggleView() {
      // Stop animation if it's running
      if (this.isAnimating) {
        this.stopAnimation();
      }

      // Toggle the view mode
      this.isMonthlyView = !this.isMonthlyView;

      // Reset error message when switching views
      this.errorMessage = "";

      // Check if we need to fetch new data
      if (this.isMonthlyView && !this.monthlyFluxData) {
        this.fetchMonthlyFluxData();
      } else if (!this.isMonthlyView && !this.annualFluxData) {
        this.fetchAnnualFluxData();
      } else {
        // If we already have the data, just update the visualization
        this.updateVisualization();
      }
    },

    toggleAnimation() {
      if (this.isAnimating) {
        this.stopAnimation();
      } else {
        this.startAnimation();
      }
    },

    startAnimation() {
      this.isAnimating = true;
      this.animationInterval = setInterval(() => {
        this.currentMonth = (this.currentMonth + 1) % 12;
        this.updateVisualization();
      }, 1500); // Change month every 1.5 seconds
    },

    stopAnimation() {
      this.isAnimating = false;
      if (this.animationInterval) {
        clearInterval(this.animationInterval);
        this.animationInterval = null;
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

.month-display {
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: bold;
  min-width: 100px;
  text-align: center;
}

.view-toggle {
  display: flex;
  align-items: center;
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

.flux-container {
  flex-grow: 1;
  width: 100%;
  height: 400px;
  position: relative;
  background-color: #f0f0f0;
  overflow: hidden;
}

.flux-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.visualization-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
}

.month-slider {
  flex-grow: 1;
  margin-left: 1rem;
}

.month-slider input {
  width: 100%;
}

.control-button {
  background-color: #3949ab;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.control-button:hover:not(:disabled) {
  background-color: #303f9f;
}

.control-button:disabled {
  background-color: #9e9e9e;
  cursor: not-allowed;
}

.legend {
  padding: 0.5rem 1rem;
  background-color: white;
  border-top: 1px solid #ddd;
}

.legend-title {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.legend-gradient {
  height: 10px;
  background: linear-gradient(
    to right,
    #00000a,
    #91009c,
    #e64616,
    #feb400,
    #fffff6
  );
  margin-bottom: 0.25rem;
  border-radius: 2px;
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #666;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3949ab;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 1rem;
  margin: 0.5rem;
  border-radius: 4px;
  text-align: center;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
