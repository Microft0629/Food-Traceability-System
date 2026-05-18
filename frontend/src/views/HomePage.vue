<!--
  首页：食品溯源入口，提供生产商/消费者/管理员三个角色导航
-->
<template>
  <div class="container">
    <div class="card" style="text-align: center; margin-top: 60px;">
      <h1>🍽️ 食品溯源系统</h1>
      <p style="margin: 16px 0 32px; color: #7f8c8d;">欢迎使用区块链食品溯源平台</p>
      <!-- 三个角色入口按钮 -->
      <div class="button-group">
        <button class="btn btn-primary" @click="goTo('/producer')">👨‍🌾 生产商入口</button>
        <button class="btn btn-primary" @click="goTo('/consumer')">🔍 消费者入口</button>
        <button class="btn btn-primary" @click="goTo('/admin')">⚙️ 管理员入口</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

/** 编程式导航跳转到指定路由 */
const goTo = (path) => {
  router.push(path)
}
</script>

<style scoped>
.button-group {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}
.btn {
  min-width: 160px;
  font-size: 1.1rem;
}
</style>
