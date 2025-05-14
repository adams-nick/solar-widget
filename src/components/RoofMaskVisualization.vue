<script setup>
import { ref, onMounted, watch } from "vue";
import axios from "axios";

const props = defineProps({
  solarData: {
    type: Object,
    required: true,
  },
  radius: {
    type: Number,
    default: 50,
  },
  showStats: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["goBack"]);

// State
const maskImage = ref(null);
const isLoading = ref(false);
const error = ref(null);
const maskStats = ref(null);
const hasMask = ref(false);

// API URL - adjust based on your environment
const API_URL = import.meta.env.VITE_API_BASE_URL || "";

const goBack = () => {
  emit("goBack");
};

// Load mask visualization based on building location
const loadMaskVisualization = async () => {
  if (!props.solarData || !props.solarData.data.center) {
    error.value = "No building data available";
    return;
  }

  const location = {
    latitude: props.solarData.data.center.latitude,
    longitude: props.solarData.data.center.longitude,
  };

  try {
    isLoading.value = true;
    error.value = null;

    // Call the mask endpoint
    const response = await axios.post(`${API_URL}/api/v1/data-layers/mask`, {
      location,
      radius: props.radius,
    });

    // Handle the response
    if (response.data && response.data.maskDataUrl) {
      maskImage.value = response.data.maskDataUrl;
      maskStats.value = response.data.stats;
      hasMask.value = response.data.hasMask;
    } else {
      throw new Error("Invalid response from server");
    }
  } catch (err) {
    console.error("Error loading mask visualization:", err);
    error.value =
      err.response?.data?.error ||
      err.message ||
      "Failed to load mask visualization";
  } finally {
    isLoading.value = false;
  }
};

// Watch for solar data changes
watch(
  () => props.solarData,
  (newData) => {
    if (newData && newData.center) {
      loadMaskVisualization();
    }
  },
  { deep: true }
);

// Load on mount if data is available
onMounted(() => {
  console.log("roof mask recieved: ", props.solarData);
  if (props.solarData && props.solarData.data.center) {
    loadMaskVisualization();
  }
});
</script>

<template>
  <div class="building-mask-visualization">
    <h3 class="visualization-title">Building Mask</h3>

    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading building mask visualization...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <p class="error-message">{{ error }}</p>
      <button @click="loadMaskVisualization" class="retry-button">Retry</button>
    </div>

    <div v-else-if="maskImage" class="mask-container">
      <img :src="maskImage" alt="Building Mask" class="mask-image" />

      <div v-if="showStats && maskStats" class="mask-stats">
        <div class="stat-item">
          <span class="stat-label">Building Coverage:</span>
          <span class="stat-value"
            >{{ maskStats.buildingPercentage.toFixed(1) }}%</span
          >
        </div>
        <div class="stat-item">
          <span class="stat-label">Building Pixels:</span>
          <span class="stat-value">{{
            maskStats.buildingPixels.toLocaleString()
          }}</span>
        </div>
      </div>
    </div>

    <div v-else class="no-data-container">
      <p>No building mask data available for this location.</p>
    </div>
  </div>
  <button @click="goBack()">Go back</button>
</template>

<style scoped>
.building-mask-visualization {
  position: relative;
  width: 100%;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.visualization-title {
  font-size: 18px;
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 16px;
  color: #202124;
}

.mask-container {
  position: relative;
  max-width: 100%;
}

.mask-image {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.mask-stats {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.stat-item {
  margin-bottom: 4px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-label {
  font-weight: 500;
  margin-right: 6px;
  color: #5f6368;
}

.stat-value {
  font-weight: 400;
  color: #202124;
}

.loading-container,
.error-container,
.no-data-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  text-align: center;
  padding: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e8eaed;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  color: #d93025;
  margin-bottom: 16px;
}

.retry-button {
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #1765cc;
}

.no-data-container p {
  color: #5f6368;
  font-style: italic;
}
</style>
