<template>
  <div class="grid-overlay">
    <div class="grid-line vertical" style="left: 33.33%"></div>
    <div class="grid-line vertical" style="left: 66.66%"></div>
    <div class="grid-line horizontal" style="top: 33.33%"></div>
    <div class="grid-line horizontal" style="top: 66.66%"></div>
  </div>
</template>

<script setup lang="ts">
// No script logic needed for this purely decorative component
</script>

<style scoped>
.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.grid-line {
  position: absolute;
}

.grid-line.vertical {
  top: 0;
  width: 0px;
  height: 100%;
  border-right: 1px dashed rgba(0, 0, 0, 0.4); /* Dashed line effect */
}

.grid-line.horizontal {
  left: 0;
  width: 100%;
  height: 0px;
  border-top: 1px dashed rgba(0, 0, 0, 0.4); /* Dashed line effect */
}
</style>
