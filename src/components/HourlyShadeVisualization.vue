<template>
  <div class="hourly-shade-visualization">
    <div class="visualization-header">
      <h2>Hourly Shade Patterns</h2>
      <div class="controls">
        <div class="date-controls">
          <select v-model="selectedMonth" @change="fetchHourlyShade">
            <option
              v-for="(month, index) in months"
              :key="index"
              :value="index"
            >
              {{ month }}
            </option>
          </select>
          <select v-model="selectedDay" @change="fetchHourlyShade">
            <option v-for="day in daysInMonth" :key="day" :value="day">
              {{ day }}
            </option>
          </select>
        </div>
        <button @click="toggleBuildingFocus" class="control-button">
          {{ buildingFocus ? "Show Full Area" : "Focus on Building" }}
        </button>
      </div>
    </div>

    <div class="visualization-content">
      <!-- Loading state -->
      <div v-if="isLoading" class="loading-container">
        <div class="loader"></div>
        <p>Loading hourly shade data...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="errorMessage" class="error-container">
        <div class="error-icon">!</div>
        <p>{{ errorMessage }}</p>
        <button @click="fetchHourlyShade()" class="retry-button">Retry</button>
      </div>

      <!-- Success state -->
      <div
        v-else-if="displayHourlyData.length > 0"
        class="hourly-data-container"
      >
        <div class="hour-slider">
          <label for="hour-slider"
            >Hour: {{ formatHour(selectedHourIndex) }}</label
          >
          <input
            id="hour-slider"
            type="range"
            min="0"
            max="23"
            v-model.number="selectedHourIndex"
          />
        </div>
        <div class="image-container">
          <img
            :src="displayHourlyData[selectedHourIndex]"
            alt="Hourly shade pattern visualization"
            class="shade-image"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <p>No hourly shade data available. Click "Fetch Data" to load.</p>
        <button @click="fetchHourlyShade()" class="primary-button">
          Fetch Data
        </button>
      </div>
    </div>
    <button @click="emitResults">Show Solar Generation Data</button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

// Props
const props = defineProps({
  solarData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["show-results"]);

// Reactive state
const fullImageData = ref([]);
const buildingFocusData = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const buildingFocus = ref(true);
const selectedMonth = ref(new Date().getMonth());
const selectedDay = ref(15); // Default to middle of month
const selectedHourIndex = ref(12); // Default to noon

// Month names
const months = [
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
];

// Compute days in selected month
const daysInMonth = computed(() => {
  const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return Array.from(
    { length: daysPerMonth[selectedMonth.value] },
    (_, i) => i + 1
  );
});

// Get current display data based on building focus toggle
const displayHourlyData = computed(() => {
  return buildingFocus.value ? buildingFocusData.value : fullImageData.value;
});

// Computed properties
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

// Format hour for display
const formatHour = (hour) => {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
};

// Toggle building focus
const toggleBuildingFocus = () => {
  buildingFocus.value = !buildingFocus.value;
  // No need to fetch data again, just toggle between already loaded datasets
};

const emitResults = () => {
  emit("show-results");
};

// Fetch hourly shade data
const fetchHourlyShade = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = "";

    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/v1/data-layers/hourly-shade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: {
          latitude: location.value.latitude,
          longitude: location.value.longitude,
        },
        radius: 50,
        month: selectedMonth.value,
        day: selectedDay.value,
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

    // Check if we have hourly data URLs
    if (
      data.hourlyDataUrls &&
      (Array.isArray(data.hourlyDataUrls.buildingFocus) ||
        Array.isArray(data.hourlyDataUrls.fullImage))
    ) {
      // Store both datasets separately
      buildingFocusData.value = data.hourlyDataUrls.buildingFocus || [];
      fullImageData.value = data.hourlyDataUrls.fullImage || [];

      // If one dataset is missing, use the other for both
      if (
        buildingFocusData.value.length === 0 &&
        fullImageData.value.length > 0
      ) {
        buildingFocusData.value = fullImageData.value;
      } else if (
        fullImageData.value.length === 0 &&
        buildingFocusData.value.length > 0
      ) {
        fullImageData.value = buildingFocusData.value;
      }

      // If both empty, throw error
      if (
        buildingFocusData.value.length === 0 &&
        fullImageData.value.length === 0
      ) {
        throw new Error("No hourly shade data available for this location");
      }
    } else {
      console.log("Data received: ", data);
      throw new Error("Invalid data format received from server");
    }
  } catch (error) {
    console.error("Error fetching hourly shade data:", error);
    errorMessage.value = error.message || "Failed to load hourly shade data";
    buildingFocusData.value = [];
    fullImageData.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Watch for changes to solarData
watch(
  () => props.solarData,
  () => {
    if (props.solarData) {
      fetchHourlyShade();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.hourly-shade-visualization {
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
  align-items: center;
}

.date-controls {
  display: flex;
  gap: 0.5rem;
}

.date-controls select {
  padding: 0.3rem;
  border-radius: 4px;
  border: 1px solid #ccc;
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

.visualization-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background-color: #fafafa;
  overflow: hidden;
}

.hourly-data-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.hour-slider {
  margin-bottom: 1rem;
}

.hour-slider label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.hour-slider input {
  width: 100%;
}

.image-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.shade-image {
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
  flex: 1;
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
  margin: 0 auto;
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
  flex: 1;
}
</style>
