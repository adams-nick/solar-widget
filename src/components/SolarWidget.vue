<script setup>
import { ref } from "vue";
import ModalBody from "./Modalbody.vue";
const show = ref(false);

const open = () => {
  show.value = true;
};

const close = () => {
  show.value = false;
};

// Expose methods to be called from outside
defineExpose({ open, close });
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="solar-modal-overlay" @click.self="close">
      <div class="solar-modal">
        <div class="solar-modal-header">
          <h2>Solar Scanner</h2>
          <button class="solar-modal-close" @click="close">&times;</button>
        </div>

        <div class="solar-modal-content">
          <!-- Future components will go here -->
          <ModalBody />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.solar-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
}

.solar-modal {
  background-color: white;
  color: black;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.solar-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.solar-modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
  color: #666;

  &:hover {
    color: #333;
  }
}

.solar-modal-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

// Responsive adjustments
@media (max-width: 768px) {
  .solar-modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .solar-modal {
    max-width: 100%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    max-height: 85vh;
  }
}
</style>
