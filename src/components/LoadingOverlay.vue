<template>
  <div class="loading-overlay">
    <div class="loading-spinner"></div>
    <div>{{ message }}</div>
  </div>
</template>

<script>
export default {
  name: "LoadingOverlay",
  props: {
    message: {
      type: String,
      default: "Loading...",
    },
  },
};
</script>

<style scoped>
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3949ab;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
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
