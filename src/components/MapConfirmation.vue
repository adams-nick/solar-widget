<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
  locationData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["confirm"]);

const mapRef = ref(null);
const map = ref(null);
const selectedBuilding = ref(null);
const errorMessage = ref("");
const isLoading = ref(false);
const buildingPolygons = ref([]);

// Currently selected building polygon
let selectedPolygon = null;

onMounted(() => {
  // Load Google Maps script if not already loaded
  if (!window.google || !window.google.maps) {
    loadGoogleMapsScript()
      .then(() => {
        initializeMap();
      })
      .catch((error) => {
        errorMessage.value = "Failed to load Google Maps";
        console.error("Error loading Google Maps:", error);
      });
  } else {
    initializeMap();
  }
});

onUnmounted(() => {
  // Clean up any resources if needed
  buildingPolygons.value.forEach((polygon) => {
    if (polygon) {
      polygon.setMap(null);
    }
  });
});

const loadGoogleMapsScript = () => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    }&libraries=places&loading=async&callback=initMap`;
    script.async = true;
    script.defer = true;

    // Define callback in global scope
    window.initMap = function () {
      resolve();
    };

    script.onerror = function () {
      reject(new Error("Google Maps failed to load"));
    };

    document.head.appendChild(script);
  });
};

const initializeMap = async () => {
  try {
    if (!props.locationData) {
      errorMessage.value = "No location data provided";
      return;
    }

    const center = {
      lat: props.locationData.latitude,
      lng: props.locationData.longitude,
    };

    // Initialize map centered on the location
    map.value = new google.maps.Map(mapRef.value, {
      center: center,
      zoom: 19, // Close zoom for building selection
      mapTypeId: "satellite", // Satellite view for building visibility
      tilt: 0, // Straight-down view
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    // Add a marker at the selected location
    new google.maps.Marker({
      position: center,
      map: map.value,
      title: "Selected Location",
    });

    // Load building footprints
    // For development, using mock data first
    //useMockData(center.lat, center.lng);

    // When ready for real API:
    fetchBuildingFootprints(center.lat, center.lng);
  } catch (error) {
    errorMessage.value = "Error initializing map";
    console.error("Error initializing map:", error);
  }
};

const useMockData = (lat, lng) => {
  // Mock data for testing
  const mockData = {
    elements: [
      {
        type: "way",
        id: 12345,
        tags: { building: "yes" },
        geometry: [
          { lat: lat - 0.0001, lon: lng - 0.0001 },
          { lat: lat - 0.0001, lon: lng + 0.0001 },
          { lat: lat + 0.0001, lon: lng + 0.0001 },
          { lat: lat + 0.0001, lon: lng - 0.0001 },
          { lat: lat - 0.0001, lon: lng - 0.0001 }, // Close the polygon
        ],
      },
      // Second building - offset from the center
      {
        type: "way",
        id: 67890,
        tags: { building: "house" },
        geometry: [
          { lat: lat - 0.0003, lon: lng - 0.0002 },
          { lat: lat - 0.0003, lon: lng },
          { lat: lat - 0.0001, lon: lng },
          { lat: lat - 0.0001, lon: lng - 0.0002 },
          { lat: lat - 0.0003, lon: lng - 0.0002 }, // Close the polygon
        ],
      },
    ],
  };

  createBuildingPolygons(mockData);
};

const fetchBuildingFootprints = async (lat, lng) => {
  try {
    isLoading.value = true;
    errorMessage.value = "";

    const url = `/api/v1/buildings/footprints?lat=${lat}&lng=${lng}`;
    console.log("Fetching buildings from:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("Building data received:", responseData);

    // Check if we have building data
    const data = responseData.data; // The actual OSM data is now in the 'data' property

    if (data.elements && data.elements.length > 0) {
      createBuildingPolygons(data);
    } else {
      console.log("No buildings found");
      errorMessage.value =
        "No buildings found at this location. Please try a different address.";
    }

    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching building footprints:", error);
    errorMessage.value = "Failed to load building footprints";
    isLoading.value = false;
  }
};

const createBuildingPolygons = (data) => {
  // Clear existing polygons
  buildingPolygons.value.forEach((polygon) => {
    polygon.setMap(null);
  });
  buildingPolygons.value = [];

  // Process OpenStreetMap data
  const buildings = data.elements.filter(
    (element) =>
      (element.type === "way" || element.type === "relation") &&
      element.tags &&
      element.tags.building
  );

  console.log(`Found ${buildings.length} building elements`);

  buildings.forEach((building) => {
    try {
      if (!building.geometry || building.geometry.length < 3) {
        console.log(
          "Building missing geometry or not enough points:",
          building
        );
        return;
      }

      const buildingCoords = [];

      // Convert OSM nodes to Google Maps LatLng objects
      building.geometry.forEach((node) => {
        buildingCoords.push({
          lat: node.lat,
          lng: node.lon,
        });
      });

      // Create polygon
      const polygon = new google.maps.Polygon({
        paths: buildingCoords,
        strokeColor: "#4285F4",
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: "#4285F4",
        fillOpacity: 0.35,
        map: map.value,
      });

      // Calculate center point
      const bounds = new google.maps.LatLngBounds();
      buildingCoords.forEach((coord) => {
        bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
      });
      const center = bounds.getCenter();

      // Store building data
      polygon.buildingData = {
        id: building.id,
        center: {
          latitude: center.lat(),
          longitude: center.lng(),
        },
        footprint: buildingCoords,
      };

      // Add click listener
      polygon.addListener("click", () => {
        selectBuilding(polygon);
      });

      buildingPolygons.value.push(polygon);
    } catch (e) {
      console.error("Error creating building polygon:", e);
    }
  });

  if (buildingPolygons.value.length === 0) {
    console.log("No valid building polygons created");
    errorMessage.value = "No valid buildings found at this location";
  } else {
    console.log(`Created ${buildingPolygons.value.length} building polygons`);
  }
};

const selectBuilding = (polygon) => {
  // Reset previously selected building
  if (selectedPolygon) {
    selectedPolygon.setOptions({
      strokeColor: "#4285F4",
      strokeWeight: 1,
      fillColor: "#4285F4",
      fillOpacity: 0.35,
    });
  }

  // Highlight the selected building
  polygon.setOptions({
    strokeColor: "#FF0000",
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.5,
  });

  selectedPolygon = polygon;
  selectedBuilding.value = polygon.buildingData;
};

const confirmSelection = () => {
  if (!selectedBuilding.value) {
    errorMessage.value = "Please select a building first";
    return;
  }

  emit("confirm", selectedBuilding.value);
};
</script>

<template>
  <div class="map-confirmation">
    <h3>Building Selection</h3>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div class="instructions">
      <p>Click on your building to select it, then confirm your selection.</p>
    </div>

    <div ref="mapRef" class="map-container"></div>

    <div v-if="selectedBuilding" class="selected-info">
      <p>
        Building selected at coordinates:
        {{ selectedBuilding.center.latitude.toFixed(6) }},
        {{ selectedBuilding.center.longitude.toFixed(6) }}
      </p>
    </div>

    <button
      class="confirm-button"
      :disabled="!selectedBuilding || isLoading"
      @click="confirmSelection"
    >
      <span v-if="isLoading">Loading...</span>
      <span v-else>Confirm Building Selection</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.map-confirmation {
  padding: 16px;

  h3 {
    margin-bottom: 16px;
    text-align: center;
  }

  .error-message {
    color: #d32f2f;
    padding: 12px;
    background-color: #ffebee;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .instructions {
    margin-bottom: 16px;
    padding: 12px;
    background-color: #e3f2fd;
    border-radius: 4px;
    text-align: center;
  }

  .map-container {
    height: 400px;
    width: 100%;
    margin-bottom: 16px;
    border-radius: 4px;
    overflow: hidden;
  }

  .selected-info {
    margin-bottom: 16px;
    padding: 12px;
    background-color: #e8f5e9;
    border-radius: 4px;
    text-align: center;
  }

  .confirm-button {
    display: block;
    width: 100%;
    padding: 12px;
    background-color: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;

    &:hover:not(:disabled) {
      background-color: #45a049;
    }

    &:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
  }
}
</style>
