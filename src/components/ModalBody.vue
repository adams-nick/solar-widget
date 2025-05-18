<script setup>
import { ref } from "vue";
import ScanRequestForm from "./ScanRequestForm.vue";
import MapConfirmation from "./MapConfirmation.vue";
import SolarResults from "./SolarResults.vue";
import SolarFluxDataLayer from "./SolarFluxDataLayer.vue";
import RgbVisualization from "./RgbVisualization.vue";
import HourlyShadeVisualization from "./HourlyShadeVisualization.vue";
import RoofMaskVisualization from "./RoofMaskVisualization.vue";
import Comprehensive from "./Comprehensive.vue";
import DsmVisualization from "./DsmVisualization.vue";

const currentStep = ref("form"); // 'form', 'map', or 'results'
const locationData = ref(null);
const buildingData = ref(null);
const solarData = ref(null);
const isLoading = ref(false);
const errorMessage = ref("");

const handleAddressSubmit = (data) => {
  locationData.value = data;
  currentStep.value = "map";
};

const handleBuildingConfirm = async (building) => {
  buildingData.value = building;

  try {
    // Show loading state
    isLoading.value = true;

    // Determine if this is a building footprint or just a point
    const buildingType = building.footprint ? "footprint" : "point";
    console.log(`Processing ${buildingType} selection:`, building);

    // Call backend API to get solar insights
    const response = await fetch("/api/v1/solar/buildingInsights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        buildingType: buildingType,
        center: {
          latitude: building.center.latitude,
          longitude: building.center.longitude,
        },
        footprint: building.footprint || null, // Include footprint if available
        buildingId: building.id,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: ${await response.text()}`
      );
    }

    const data = await response.json();
    console.log("Solar API response:", data);

    // Store results and update UI
    solarData.value = data;
    currentStep.value = "results";

    isLoading.value = false;
  } catch (error) {
    isLoading.value = false;
    errorMessage.value = `Failed to get solar data: ${error.message}`;
    console.error("Error getting building insights:", error);
  }
};

const resetToMap = () => {
  errorMessage.value = "";
  currentStep.value = "map";
};
</script>

<template>
  <div class="modal-body">
    {{ currentStep }}
    <ScanRequestForm
      v-if="currentStep === 'form'"
      @submit="handleAddressSubmit"
    />

    <Comprehensive
      v-if="currentStep === 'form'"
      :location="{
        latitude: 39.73968535,
        longitude: -104.9895472,
      }"
    />
    <MapConfirmation
      v-else-if="currentStep === 'map'"
      :locationData="locationData"
      @confirm="handleBuildingConfirm"
    />

    <div v-else-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Analyzing solar potential...</p>
    </div>

    <div v-else-if="errorMessage" class="error-container">
      <p>{{ errorMessage }}</p>
      <button @click="resetToMap">Try Again</button>
    </div>

    <SolarResults
      v-else-if="currentStep === 'results'"
      :solarData="solarData"
      @switchView="currentStep = $event"
    />

    <RoofMaskVisualization
      v-else-if="currentStep === 'roof-mask'"
      :solarData="solarData"
      @goBack="currentStep = 'results'"
    />

    <SolarFluxDataLayer
      :solarData="solarData"
      @goBack="currentStep = 'results'"
      v-else-if="currentStep === 'flux'"
    />

    <RgbVisualization
      :solarData="solarData"
      @goBack="currentStep = 'results'"
      v-else-if="currentStep === 'aerial'"
    />

    <DsmVisualization
      :solarData="solarData"
      @goBack="currentStep = 'results'"
      v-else-if="currentStep === 'dsm'"
    />

    <HourlyShadeVisualization
      :solarData="solarData"
      v-else-if="currentStep === 'hourly'"
      @goBack="currentStep = 'results'"
    />
  </div>
</template>

<style lang="scss" scoped>
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #4caf50;
    border-radius: 50%;
    animation: spin 2s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}

.error-container {
  text-align: center;
  padding: 24px 16px;
  background-color: #ffebee;
  border-radius: 8px;

  p {
    color: #d32f2f;
    margin-bottom: 16px;
  }

  button {
    background-color: #d32f2f;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background-color: #b71c1c;
    }
  }
}
</style>
