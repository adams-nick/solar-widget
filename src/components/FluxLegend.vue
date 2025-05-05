<template>
  <div class="legend">
    <div class="legend-title">Solar Energy Potential</div>
    <div class="legend-gradient"></div>
    <div class="legend-labels">
      <span>Low</span>
      <span>Medium</span>
      <span>High</span>
    </div>
  </div>
</template>

<script>
export default {
  name: "FluxLegend",
};
</script>

<style scoped>
.legend {
  padding: 0.5rem 1rem;
  background-color: white;
  border-top: 1px solid #ddd;
}

.legend-title {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.legend-gradient {
  height: 10px;
  background: linear-gradient(
    to right,
    #00000a,
    #91009c,
    #e64616,
    #feb400,
    #fffff6
  );
  margin-bottom: 0.25rem;
  border-radius: 2px;
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #666;
}
</style>
