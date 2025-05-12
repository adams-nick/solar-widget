// visualization.js

/**
 * Creates a visualization of bounding boxes over an image
 * @param {Object} params - Visualization parameters
 * @param {string} params.imageData - Base64 encoded image or image URL
 * @param {Object} params.buildingBox - Building bounding box in pixel coordinates {min_x, min_y, max_x, max_y}
 * @param {Array} params.roofSegments - Array of roof segments with pixel coordinates
 * @param {number} params.width - Canvas width (default: image width)
 * @param {number} params.height - Canvas height (default: image height)
 * @returns {Promise<string>} - Promise resolving to a data URL of the visualization
 */
export async function createBoundingBoxVisualization(params) {
  const { imageData, buildingBox, roofSegments = [], width, height } = params;

  console.log("Visualization params:", {
    buildingBox,
    roofSegments: roofSegments.length,
    width,
    height,
  });

  // Create a promise to handle image loading
  return new Promise((resolve, reject) => {
    // Create image element
    const img = new Image();

    // Handle image loading
    img.onload = () => {
      console.log(
        "Image loaded with dimensions:",
        img.naturalWidth,
        "x",
        img.naturalHeight
      );

      // Create canvas with image dimensions or specified dimensions
      const canvas = document.createElement("canvas");
      canvas.width = width || img.naturalWidth;
      canvas.height = height || img.naturalHeight;

      console.log("Canvas dimensions:", canvas.width, "x", canvas.height);

      // Get context for drawing
      const ctx = canvas.getContext("2d");

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw building box if provided
      if (buildingBox && typeof buildingBox === "object") {
        console.log("Drawing building box:", buildingBox);

        if (
          typeof buildingBox.min_x === "number" &&
          typeof buildingBox.min_y === "number" &&
          typeof buildingBox.max_x === "number" &&
          typeof buildingBox.max_y === "number"
        ) {
          // Draw with a solid red stroke
          ctx.strokeStyle = "rgba(255, 0, 0, 1)";
          ctx.lineWidth = 3;

          const boxWidth = buildingBox.max_x - buildingBox.min_x;
          const boxHeight = buildingBox.max_y - buildingBox.min_y;

          console.log(
            `Drawing box at (${buildingBox.min_x}, ${buildingBox.min_y}) with dimensions ${boxWidth} x ${boxHeight}`
          );

          ctx.strokeRect(
            buildingBox.min_x,
            buildingBox.min_y,
            boxWidth,
            boxHeight
          );
        } else {
          console.error("Invalid building box coordinates:", buildingBox);
        }
      } else {
        console.log("No building box provided or invalid format");
      }

      // Draw roof segments
      if (
        roofSegments &&
        Array.isArray(roofSegments) &&
        roofSegments.length > 0
      ) {
        console.log(`Drawing ${roofSegments.length} roof segments`);

        // Define colors for roof segments
        const colors = [
          "rgba(0, 255, 0, 1)", // Green
          "rgba(0, 0, 255, 1)", // Blue
          "rgba(255, 255, 0, 1)", // Yellow
          "rgba(255, 0, 255, 1)", // Magenta
          "rgba(0, 255, 255, 1)", // Cyan
        ];

        roofSegments.forEach((segment, index) => {
          if (
            typeof segment.min_x === "number" &&
            typeof segment.min_y === "number" &&
            typeof segment.max_x === "number" &&
            typeof segment.max_y === "number"
          ) {
            // Select color for this segment
            const colorIndex = index % colors.length;
            ctx.strokeStyle = colors[colorIndex];
            ctx.lineWidth = 2;

            const segWidth = segment.max_x - segment.min_x;
            const segHeight = segment.max_y - segment.min_y;

            console.log(
              `Drawing segment ${index} at (${segment.min_x}, ${segment.min_y}) with dimensions ${segWidth} x ${segHeight}`
            );

            // Draw segment bounding box
            ctx.strokeRect(segment.min_x, segment.min_y, segWidth, segHeight);
          } else {
            console.error(`Invalid coordinates for segment ${index}:`, segment);
          }
        });
      } else {
        console.log("No roof segments provided or empty array:", roofSegments);
      }

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL("image/png");
      console.log("Visualization complete, data URL length:", dataUrl.length);
      resolve(dataUrl);
    };

    // Handle loading error
    img.onerror = (error) => {
      console.error("Image loading error:", error);
      reject(new Error(`Failed to load image for visualization: ${error}`));
    };

    // Set image source
    try {
      if (typeof imageData !== "string") {
        console.error("imageData is not a string:", typeof imageData);
        reject(new Error("imageData must be a string"));
        return;
      }

      if (imageData.startsWith("data:")) {
        console.log("Loading data URL image");
        img.src = imageData;
      } else if (imageData.startsWith("http")) {
        console.log("Loading URL image:", imageData);
        img.crossOrigin = "anonymous";
        img.src = imageData;
      } else {
        console.log("Loading base64 image");
        img.src = `data:image/png;base64,${imageData}`;
      }
    } catch (error) {
      console.error("Error setting image source:", error);
      reject(error);
    }
  });
}

/**
 * Convert geographic coordinates to pixel coordinates
 * @param {Object} params - Parameters for conversion
 * @returns {Object} - Converted coordinates
 */
export function convertGeoToPixel(params) {
  const { imgWidth, imgHeight, buildingBoundingBox, roofSegments } = params;

  console.log("Converting geo coordinates to pixel coordinates");
  console.log("Image dimensions:", imgWidth, "x", imgHeight);

  if (
    !buildingBoundingBox ||
    !buildingBoundingBox.ne ||
    !buildingBoundingBox.sw
  ) {
    console.error(
      "Invalid building bounding box for conversion:",
      buildingBoundingBox
    );
    return { buildingBox: null, roofSegments: [] };
  }

  // Function to convert a single geographic coordinate to pixels
  function geoToPixel(lat, lng, bounds) {
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

  // Convert building bounding box to pixel coordinates
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

  const buildingBoxPixel = {
    min_x: Math.min(swPixel.x, nePixel.x),
    min_y: Math.min(swPixel.y, nePixel.y),
    max_x: Math.max(swPixel.x, nePixel.x),
    max_y: Math.max(swPixel.y, nePixel.y),
  };

  console.log("Converted building box:", buildingBoxPixel);

  // Convert roof segments to pixel coordinates
  const roofSegmentsPixel = [];

  if (Array.isArray(roofSegments) && roofSegments.length > 0) {
    console.log(`Converting ${roofSegments.length} roof segments`);

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

        roofSegmentsPixel.push(segmentPixel);
      } else {
        console.error("Segment missing boundingBox:", segment);
      }
    }

    console.log(`Converted ${roofSegmentsPixel.length} roof segments`);
  } else {
    console.log("No roof segments to convert");
  }

  return {
    buildingBox: buildingBoxPixel,
    roofSegments: roofSegmentsPixel,
  };
}
