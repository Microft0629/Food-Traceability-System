<!--
  应用根组件：顶部导航栏 + 路由视图
  挂载时自动尝试初始化合约（如 MetaMask 已连接则恢复会话）
-->
<template>
  <LayoutHeader />
  <!-- router-view 根据当前路由渲染对应页面组件 -->
  <router-view />
</template>

<script setup>
import LayoutHeader from "./components/LayoutHeader.vue";
import { onMounted } from "vue";
import { initContract } from "./composables/useContract";

// 页面加载时立即尝试初始化合约
// 若用户之前已连接 MetaMask，可恢复钱包会话
onMounted(() => {
  initContract();
});
</script>
