<template>
  <div class="rgb-visualization">
    <div class="visualization-header">
      <h2>Aerial Imagery</h2>
      <div class="controls">
        <button @click="toggleBuildingFocus" class="control-button">
          {{ buildingFocus ? "Show Full Area" : "Focus on Building" }}
        </button>
        <button
          v-if="errorMessage"
          @click="fetchRgbData()"
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
        <p>Loading aerial imagery...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="errorMessage" class="error-container">
        <div class="error-icon">!</div>
        <p>{{ errorMessage }}</p>
      </div>

      <!-- Success state -->
      <div v-else-if="displayRgbData" class="image-container">
        <img
          :src="displayRgbData"
          alt="Aerial view of building location"
          class="aerial-image"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <p>No aerial imagery available. Click "Fetch Imagery" to load.</p>
        <button @click="fetchRgbData()" class="primary-button">
          Fetch Imagery
        </button>
      </div>
    </div>
  </div>
  <button @click="emitHourlyShade()">Show Hourly Shade layer</button>
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

const emit = defineEmits(["show-hourly-shade-layer"]);

// Reactive state
const buildingFocusData = ref(null);
const fullImageData = ref(null);
const isLoading = ref(false);
const errorMessage = ref("");
const buildingFocus = ref(true);

// Computed properties to determine which data URL to display
const displayRgbData = computed(() => {
  return buildingFocus.value ? buildingFocusData.value : fullImageData.value;
});

const location = computed(() => {
  // First check solarData.data.center
  if (props.solarData?.data?.center) {
    return props.solarData.data.center;
  }
  // Fall back to solarData.center
  if (props.solarData?.center) {
    return props.solarData.center;
  }
  // Default
  return { latitude: 37.7749, longitude: -122.4194 };
});

// Methods
const emitHourlyShade = () => {
  console.log("emitting to go to hourly shade");
  emit("show-hourly-shade-layer");
};

const fetchRgbData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = "";

    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/v1/data-layers/rgb`, {
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
    console.log("rgb data: ", data);

    if (
      data.dataUrls &&
      (data.dataUrls.buildingFocus || data.dataUrls.fullImage)
    ) {
      // Store both datasets
      buildingFocusData.value = data.dataUrls.buildingFocus;
      fullImageData.value = data.dataUrls.fullImage;

      // If one dataset is missing, use the other for both
      if (!buildingFocusData.value && fullImageData.value) {
        buildingFocusData.value = fullImageData.value;
      } else if (!fullImageData.value && buildingFocusData.value) {
        fullImageData.value = buildingFocusData.value;
      }
    } else if (data.dataUrl) {
      // Handle backward compatibility with older API
      buildingFocusData.value = data.dataUrl;
      fullImageData.value = data.dataUrl;
    } else if (data.visualizations) {
      // Handle alternative response format
      buildingFocusData.value = data.visualizations;
      fullImageData.value = data.visualizations;
    } else {
      throw new Error("No aerial imagery available for this location");
    }
  } catch (error) {
    console.error("Error fetching RGB data:", error);
    errorMessage.value = error.message || "Failed to load aerial imagery";
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
    fetchRgbData();
  }
});

watch(
  () => props.solarData,
  () => {
    if (props.solarData) {
      fetchRgbData();
    }
  },
  { deep: true }
);
</script>

<style scoped>
.rgb-visualization {
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
  background-color: #4caf50;
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
  background-color: #388e3c;
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
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.aerial-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  border-top: 5px solid #4caf50;
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
