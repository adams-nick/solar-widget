<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const emit = defineEmits(["submit"]);

const address = ref("");
const addressInput = ref(null);
const isLoading = ref(false);

// Helper function to search for places
// Modify the searchPlaces function in ScanRequestForm.vue
const searchPlaces = async (input) => {
  try {
    if (!input || input.length < 3) return { candidates: [] };

    // Make sure the URL is correct and matches your API endpoint
    const response = await fetch(
      `http://localhost:3000/api/v1/places/search?query=${encodeURIComponent(
        input
      )}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Place search response:", data); // Debugging log
    return data;
  } catch (error) {
    console.error("Error searching for places:", error);
    return { candidates: [] };
  }
};

// List of suggestions
const suggestions = ref([]);
const showSuggestions = ref(false);

// Handle input changes to fetch suggestions
const handleInput = async () => {
  if (address.value.length < 3) {
    suggestions.value = [];
    showSuggestions.value = false;
    return;
  }

  isLoading.value = true;
  const result = await searchPlaces(address.value);
  suggestions.value = result.candidates || [];
  showSuggestions.value = suggestions.value.length > 0;
  isLoading.value = false;
};

// Handle suggestion selection
const selectSuggestion = (suggestion) => {
  address.value = suggestion.formatted_address || suggestion.name;
  showSuggestions.value = false;

  const location = {
    address: suggestion.formatted_address || suggestion.name,
    latitude: suggestion.geometry.location.lat,
    longitude: suggestion.geometry.location.lng,
    placeId: suggestion.place_id,
  };

  emit("submit", location);
};

// Close suggestions when clicking outside
const handleClickOutside = (event) => {
  if (addressInput.value && !addressInput.value.contains(event.target)) {
    showSuggestions.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

// Cleanup
onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="scan-request-form">
    <h3>Enter Your Address</h3>

    <div class="form-section">
      <div class="input-container" ref="addressInput">
        <input
          v-model="address"
          type="text"
          placeholder="Enter your address"
          @input="handleInput"
          @keyup.enter="handleInput"
        />
        <div v-if="isLoading" class="loading-indicator">
          <div class="spinner"></div>
        </div>

        <div v-if="showSuggestions" class="suggestions-container">
          <div
            v-for="(suggestion, index) in suggestions"
            :key="index"
            class="suggestion-item"
            @click="selectSuggestion(suggestion)"
          >
            {{ suggestion.formatted_address || suggestion.name }}
          </div>
        </div>
      </div>

      <p class="helper-text">
        Start typing and select your address from the suggestions
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.scan-request-form {
  padding: 16px;

  h3 {
    margin-bottom: 16px;
    text-align: center;
  }

  .form-section {
    margin-bottom: 16px;

    .input-container {
      position: relative;

      input {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;

        &:focus {
          outline: none;
          border-color: #4caf50;
          box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
        }
      }

      .loading-indicator {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #4caf50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      }

      .suggestions-container {
        position: absolute;
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        background: white;
        border: 1px solid #ddd;
        border-top: none;
        border-radius: 0 0 4px 4px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        z-index: 10;

        .suggestion-item {
          padding: 10px 12px;
          cursor: pointer;

          &:hover {
            background-color: #f5f5f5;
          }
        }
      }
    }

    .helper-text {
      margin-top: 8px;
      font-size: 14px;
      color: #666;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
