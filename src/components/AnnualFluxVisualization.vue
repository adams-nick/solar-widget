<template>
  <div class="annual-flux-visualization">
    <div class="flux-container">
      <img
        v-if="annualDataLoaded && annualImageSrc"
        :src="annualImageSrc"
        class="flux-image"
        alt="Annual solar flux visualization"
      />

      <loading-overlay v-if="isLoading" message="Loading solar data..." />

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import LoadingOverlay from "./LoadingOverlay.vue";

export default {
  name: "AnnualFluxVisualization",
  components: {
    LoadingOverlay,
  },
  props: {
    annualData: {
      type: Object,
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
  computed: {
    annualDataLoaded() {
      return this.annualData && this.annualData.rawFlux;
    },
    annualImageSrc() {
      return this.annualDataLoaded ? this.annualData.rawFlux : null;
    },
  },
  watch: {
    annualData: {
      immediate: true,
      handler(newData) {
        if (!newData && !this.isLoading) {
          this.$emit("fetch-data");
        }
      },
    },
  },
};
</script>

<style scoped>
.annual-flux-visualization {
  width: 100%;
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

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 1rem;
  margin: 0.5rem;
  border-radius: 4px;
  text-align: center;
}
</style>
