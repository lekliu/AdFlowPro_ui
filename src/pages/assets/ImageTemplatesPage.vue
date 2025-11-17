<template>
  <div class="page-container">
    <el-card shadow="never">
      <ImageTemplateBrowser mode="browse" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import ImageTemplateBrowser from "@/components/browsers/ImageTemplateBrowser.vue";
</script>

<style scoped>
.page-container {
  padding: 20px;
}
</style>
