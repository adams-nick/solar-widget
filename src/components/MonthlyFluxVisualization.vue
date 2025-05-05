<template>
  <div class="monthly-flux-visualization">
    <div class="month-display">
      <span class="month-label">{{ currentMonthName }}</span>
    </div>

    <div class="flux-container">
      <img
        v-if="monthlDataLoaded && currentFluxImageUrl"
        :src="currentFluxImageUrl"
        class="flux-image"
        alt="Monthly solar flux visualization"
      />

      <loading-overlay v-if="isLoading" message="Loading solar data..." />

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>

    <div class="visualization-controls">
      <button
        @click="toggleAnimation"
        class="control-button"
        :disabled="!monthlDataLoaded || isLoading"
      >
        {{ isAnimating ? "Pause" : "Play" }} Animation
      </button>

      <div class="month-slider">
        <input
          type="range"
          min="0"
          max="11"
          v-model.number="currentMonth"
          :disabled="isAnimating || !monthlDataLoaded || isLoading"
        />
      </div>
    </div>
  </div>
</template>

<script>
import LoadingOverlay from "./LoadingOverlay.vue";

export default {
  name: "MonthlyFluxVisualization",
  components: {
    LoadingOverlay,
  },
  props: {
    monthlyData: {
      type: Array,
      default: null,
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
    errorMessage: {
      type: String,
      default: "",
    },
    location: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      currentMonth: 0,
      isAnimating: false,
      animationInterval: null,
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
    monthlDataLoaded() {
      return (
        !!this.monthlyData &&
        Array.isArray(this.monthlyData) &&
        this.monthlyData.length > 0
      );
    },
    currentFluxImageUrl() {
      return this.monthlDataLoaded ? this.monthlyData[this.currentMonth] : null;
    },
  },
  watch: {
    monthlyData: {
      immediate: true,
      handler(newData) {
        if (!newData && !this.isLoading) {
          this.$emit("fetch-data");
        }
      },
    },
    currentMonth() {
      // No need for an explicit update method since we're using computed properties
    },
  },
  beforeUnmount() {
    this.stopAnimation();
  },
  methods: {
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
.monthly-flux-visualization {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.month-display {
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: bold;
  min-width: 100px;
  text-align: center;
  align-self: flex-end;
  margin: 0.5rem;
}

.flux-container {
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

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 1rem;
  margin: 0.5rem;
  border-radius: 4px;
  text-align: center;
}
</style>
