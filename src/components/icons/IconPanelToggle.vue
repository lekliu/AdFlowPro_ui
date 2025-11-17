<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="panel-toggle-icon"
  >
    <!-- Main window frame -->
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <!-- The dynamic bottom panel line -->
    <line :y1="linePosition" :y2="linePosition" x1="3" x2="21"></line>
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  isOpen: boolean;
}>();

// This computed property will move the horizontal line up or down
const linePosition = computed(() => (props.isOpen ? 15 : 21));
</script>

<style scoped>
.panel-toggle-icon {
  transition: all 0.3s ease;
}
.panel-toggle-icon line {
  transition: all 0.3s ease;
}
</style>
