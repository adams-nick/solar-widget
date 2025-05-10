<template>
  <div class="roof-segmentation">
    <div class="visualization-header">
      <h2>Roof Segmentation</h2>
      <div class="controls">
        <button @click="processRoofSegments" :disabled="isLoading">
          {{ isLoading ? "Processing..." : "Analyze Roof" }}
        </button>
        <button v-if="errorMessage" @click="processRoofSegments()">
          Retry
        </button>
      </div>
    </div>

    <div class="visualization-content">
      <!-- Loading state -->
      <div v-if="isLoading">
        <div class="loader"></div>
        <p>Analyzing roof segments...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="errorMessage">
        <p>{{ errorMessage }}</p>
      </div>

      <!-- Success state with segmentation -->
      <div v-else-if="segmentationResult">
        <div class="segmentation-overlay">
          <img
            :src="displayRgbData"
            alt="Aerial view of building location"
            ref="imageRef"
          />
          <svg
            class="segment-overlay"
            xmlns="http://www.w3.org/2000/svg"
            :width="imageWidth"
            :height="imageHeight"
            style="position: absolute; top: 0; left: 0"
          >
            <polygon
              v-for="(segment, index) in segmentationResult.roof_segments"
              :key="`roof-${index}`"
              :points="formatPolygonPoints(segment.polygon)"
              :fill="getSegmentColor(index)"
              fill-opacity="0.4"
              stroke="#ffffff"
              stroke-width="2"
            />
          </svg>
        </div>
        <div class="segment-info">
          <p>Detected {{ segmentationResult.num_segments }} roof segments</p>
          <p>
            Processing time:
            {{
              Math.round(segmentationResult.processing_time_seconds * 100) /
              100
            }}s
          </p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else>
        <p>
          No roof segmentation data available. Click "Analyze Roof" to process.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";

// Props
const props = defineProps({
  solarData: {
    type: Object,
    required: true,
  },
  displayRgbData: {
    type: String,
    required: true,
  },
});

// Reactive state
const isLoading = ref(false);
const errorMessage = ref("");
const segmentationResult = ref(null);
const imageWidth = ref(600);
const imageHeight = ref(400);
const imageRef = ref(null);

// Format polygon points for SVG
const formatPolygonPoints = (polygon) => {
  if (!polygon || !Array.isArray(polygon)) return "";
  return polygon.map((p) => `${p.x},${p.y}`).join(" ");
};

// Get a color for each segment
const getSegmentColor = (index) => {
  const colors = [
    "#3498db", // Blue
    "#2ecc71", // Green
    "#e74c3c", // Red
    "#f39c12", // Orange
    "#9b59b6", // Purple
    "#1abc9c", // Teal
    "#e67e22", // Dark Orange
    "#34495e", // Navy
  ];
  return colors[index % colors.length];
};

// Get building bounding box dimensions based on image size
const buildingBox = computed(() => {
  // Center 80% of the image as default building focus area
  return {
    min_x: imageWidth.value * 0.1,
    min_y: imageHeight.value * 0.1,
    max_x: imageWidth.value * 0.9,
    max_y: imageHeight.value * 0.9,
  };
});

// Methods
const updateImageDimensions = () => {
  return new Promise((resolve) => {
    if (!props.displayRgbData) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageWidth.value = img.width;
      imageHeight.value = img.height;
      resolve();
    };
    img.onerror = () => {
      console.error("Failed to load image for dimensions");
      resolve(); // Continue with default dimensions
    };
    img.src = props.displayRgbData;
  });
};

const extractBase64FromDataUrl = (dataUrl) => {
  // Check if it's already a base64 data URL
  if (dataUrl.startsWith("data:image/")) {
    // Return just the base64 part without the prefix
    return dataUrl.split(",")[1];
  }

  // If it's not a data URL, we need to fetch it and convert it
  // But for this example, we'll assume it's already a data URL
  console.warn("Image URL is not in data:image format, may not work with SAM");
  return dataUrl;
};

const processRoofSegments = async () => {
  if (!props.displayRgbData) {
    errorMessage.value = "No aerial imagery available";
    return;
  }

  try {
    isLoading.value = true;
    errorMessage.value = "";

    // Update image dimensions before processing
    await updateImageDimensions();

    // Extract base64 image data
    const base64Image = extractBase64FromDataUrl(props.displayRgbData);

    // Send the request to your API endpoint
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/v1/roof/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingId: props.solarData?.data?.id || "unknown-building",
        rgbImage: base64Image, // Send base64 directly
        buildingBox: buildingBox.value,
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

    segmentationResult.value = await response.json();
    console.log("Roof segmentation result:", segmentationResult.value);
  } catch (error) {
    console.error("Error processing roof segments:", error);
    errorMessage.value = error.message || "Failed to process roof segments";
    segmentationResult.value = null;
  } finally {
    isLoading.value = false;
  }
};

// Lifecycle hooks and watchers
onMounted(async () => {
  await updateImageDimensions();
});

watch(
  () => props.displayRgbData,
  async () => {
    // Reset segmentation when the image changes
    segmentationResult.value = null;
    await updateImageDimensions();
  }
);

// If you want segmentation to happen automatically when image loads:
// watch(() => props.displayRgbData, async (newVal) => {
//   if (newVal) {
//     await updateImageDimensions();
//     processRoofSegments();
//   }
// });
</script>

<style scoped></style>
