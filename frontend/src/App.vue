<template>
  <LayoutHeader />
  <!-- 添加导航头 -->
  <router-view />
  <!-- 必须添加这个，否则页面切换不显示内容 -->
</template>

<script setup>
import LayoutHeader from "./components/LayoutHeader.vue";
import { onMounted } from "vue";
import { initContract } from "./composables/useContract";

onMounted(() => {
  initContract(); // 页面加载时尝试初始化合约
});
</script>
