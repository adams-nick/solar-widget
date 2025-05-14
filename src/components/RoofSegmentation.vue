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
        <button @click="printSolarData()">Console Data</button>
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

    <div v-if="visualizationSrc">
      <h3>Bounding Box Visualization</h3>
      <img :src="visualizationSrc" alt="Bounding Box Visualization" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { createBoundingBoxVisualization } from "./visualization.js";
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

const printSolarData = () => {
  console.log("solar data -  ", props.solarData);
};

// Reactive state
const isLoading = ref(false);
const errorMessage = ref("");
const segmentationResult = ref(null);
const imageWidth = ref(600);
const imageHeight = ref(400);
const imageRef = ref(null);
const visualizationSrc = ref("");

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

    // Get image dimensions from the image reference
    const imageDimensions = getImageDimensions(imageRef);

    // Convert coordinates using the dimensions
    const roofSegments = props.solarData?.roofSegments?.data || [];
    const buildingCenter = props.solarData?.buildingInsights?.center;
    const buildingBoundingBox = props.solarData?.buildingInsights?.boundingBox;
    const pixelCoordinates = convertGeoToPixel({
      imgWidth: imageDimensions.width,
      imgHeight: imageDimensions.height,
      buildingBoundingBox,
      buildingCenter,
      roofSegments,
    });

    console.log("passing roof segments to visualizer: ", pixelCoordinates);
    const vizDataUrl = await createBoundingBoxVisualization({
      imageData: base64Image,
      buildingBox: pixelCoordinates.buildingBox,
      roofSegments: pixelCoordinates.roofSegments,
      width: imageDimensions.width,
      height: imageDimensions.height,
    });
    // Set the visualization source
    visualizationSrc.value = vizDataUrl;

    // Send the request to your API endpoint
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/v1/roof/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingId: props.solarData?.buildingInsights?.id || "unknown-building",
        rgbImage: base64Image, // Send base64 directly
        buildingBox: buildingBox.value,
        roofSegments: pixelCoordinates.roofSegments,
        buildingBoundingBox: pixelCoordinates.buildingBox,
        buildingCenter: pixelCoordinates.buildingCenter,
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

/**
 * Gets the actual dimensions of an image from a Vue ref
 * @param {Object} imageRef - Vue ref object pointing to an img element
 * @param {number} defaultWidth - Default width to use if image dimensions can't be determined
 * @param {number} defaultHeight - Default height to use if image dimensions can't be determined
 * @returns {Object} - Object with width and height properties
 */
function getImageDimensions(imageRef, defaultWidth = 400, defaultHeight = 224) {
  // Check if the imageRef exists and is valid
  if (!imageRef || !imageRef.value) {
    console.warn(
      "Image reference is missing or invalid. Using default dimensions."
    );
    return { width: defaultWidth, height: defaultHeight };
  }

  const imgElement = imageRef.value;

  // Use naturalWidth/naturalHeight for the actual image dimensions
  // These values represent the intrinsic size of the image, not affected by CSS styling
  if (imgElement.naturalWidth && imgElement.naturalHeight) {
    return {
      width: imgElement.naturalWidth,
      height: imgElement.naturalHeight,
    };
  }

  // Fallback to width/height properties if naturalWidth/naturalHeight are not available
  if (imgElement.width && imgElement.height) {
    // Check if dimensions appear to be CSS-affected (very small or 0)
    if (imgElement.width < 10 || imgElement.height < 10) {
      console.warn(
        "Image dimensions seem too small, possibly affected by CSS. Using default dimensions."
      );
      return { width: defaultWidth, height: defaultHeight };
    }
    return {
      width: imgElement.width,
      height: imgElement.height,
    };
  }

  // If image dimensions can't be determined, use defaults
  console.warn(
    "Could not determine image dimensions. Using default dimensions."
  );
  return { width: defaultWidth, height: defaultHeight };
}

/**
 * Convert geographic coordinates to pixel coordinates for ML server
 * @param {Object} params - Input parameters
 * @param {number} params.imgWidth - Image width in pixels
 * @param {number} params.imgHeight - Image height in pixels
 * @param {Object} params.buildingBoundingBox - Geographic bounding box of the building
 * @param {Object} params.buildingCenter - Geographic center of the building
 * @param {Array} params.roofSegments - Array of roof segment objects with geographic coordinates
 * @returns {Object} - Converted coordinates for ML server
 */
function convertGeoToPixel(params) {
  const {
    imgWidth,
    imgHeight,
    buildingBoundingBox,
    buildingCenter,
    roofSegments,
  } = params;

  // Function to convert a single geographic coordinate to pixels
  function geoToPixel(lat, lng, bounds) {
    // If bounds are not available, return center of image
    if (!bounds || !bounds.ne || !bounds.sw) {
      return { x: imgWidth / 2, y: imgHeight / 2 };
    }

    // Calculate pixel coordinates
    // Note: In images, Y increases downward
    const x =
      ((lng - bounds.sw.longitude) /
        (bounds.ne.longitude - bounds.sw.longitude)) *
      imgWidth;
    const y =
      ((bounds.ne.latitude - lat) / (bounds.ne.latitude - bounds.sw.latitude)) *
      imgHeight;

    return {
      x: Math.min(Math.max(0, Math.round(x)), imgWidth - 1),
      y: Math.min(Math.max(0, Math.round(y)), imgHeight - 1),
    };
  }

  // Convert building center to pixel coordinates
  let buildingCenterPixel = { x: imgWidth / 2, y: imgHeight / 2 };
  if (buildingCenter && buildingCenter.latitude && buildingCenter.longitude) {
    buildingCenterPixel = geoToPixel(
      buildingCenter.latitude,
      buildingCenter.longitude,
      buildingBoundingBox
    );
  }

  // Convert building bounding box to pixel coordinates
  let buildingBoxPixel = {
    min_x: 0,
    min_y: 0,
    max_x: imgWidth - 1,
    max_y: imgHeight - 1,
  };

  if (buildingBoundingBox && buildingBoundingBox.sw && buildingBoundingBox.ne) {
    const swPixel = geoToPixel(
      buildingBoundingBox.sw.latitude,
      buildingBoundingBox.sw.longitude,
      buildingBoundingBox
    );
    const nePixel = geoToPixel(
      buildingBoundingBox.ne.latitude,
      buildingBoundingBox.ne.longitude,
      buildingBoundingBox
    );

    buildingBoxPixel = {
      min_x: Math.min(swPixel.x, nePixel.x),
      min_y: Math.min(swPixel.y, nePixel.y),
      max_x: Math.max(swPixel.x, nePixel.x),
      max_y: Math.max(swPixel.y, nePixel.y),
    };
  }

  // Convert roof segments to pixel coordinates
  const roofSegmentsPixel = [];

  if (Array.isArray(roofSegments)) {
    for (const segment of roofSegments) {
      if (
        segment.boundingBox &&
        segment.boundingBox.sw &&
        segment.boundingBox.ne
      ) {
        const swPixel = geoToPixel(
          segment.boundingBox.sw.latitude,
          segment.boundingBox.sw.longitude,
          buildingBoundingBox
        );
        const nePixel = geoToPixel(
          segment.boundingBox.ne.latitude,
          segment.boundingBox.ne.longitude,
          buildingBoundingBox
        );

        const segmentPixel = {
          id: segment.id,
          min_x: Math.min(swPixel.x, nePixel.x),
          min_y: Math.min(swPixel.y, nePixel.y),
          max_x: Math.max(swPixel.x, nePixel.x),
          max_y: Math.max(swPixel.y, nePixel.y),
        };

        // Copy other properties
        if (segment.azimuth !== undefined)
          segmentPixel.azimuth = segment.azimuth;
        if (segment.pitch !== undefined) segmentPixel.pitch = segment.pitch;
        if (segment.isGroup !== undefined)
          segmentPixel.is_group = segment.isGroup;

        roofSegmentsPixel.push(segmentPixel);
      }
    }
  }

  // Return the converted values
  return {
    buildingCenter: buildingCenterPixel,
    buildingBox: buildingBoxPixel,
    roofSegments: roofSegmentsPixel,
    imageWidth: imgWidth,
    imageHeight: imgHeight,
  };
}

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
