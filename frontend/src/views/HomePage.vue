<!-- src/views/HomePage.vue -->
<template>
  <div class="container">
    <div class="card" style="text-align: center; margin-top: 60px;">
      <h1>🍽️ 食品溯源系统</h1>
      <p style="margin: 16px 0 32px; color: #7f8c8d;">欢迎使用区块链食品溯源平台</p>
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

// 跳转函数
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
</style>// 首页（导航入口）
