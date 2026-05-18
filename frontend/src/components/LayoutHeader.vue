<!--
  全局顶部导航栏：粘性定位，包含首页/生产商/消费者/管理员四个导航链接
-->
<template>
  <header class="header">
    <div class="header-container">
      <!-- 左侧 Logo，点击回到首页 -->
      <div class="logo">
        <router-link to="/" class="logo-link">🍅 食品溯源</router-link>
      </div>
      <!-- 右侧导航链接 -->
      <nav class="nav-links">
        <router-link to="/producer" class="nav-link">生产商</router-link>
        <router-link to="/consumer" class="nav-link">消费者</router-link>
        <router-link to="/admin" class="nav-link">管理员</router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  /* 粘性定位：滚动时始终保持在视口顶部 */
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}
.logo-link {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
  text-decoration: none;
}
.nav-links {
  display: flex;
  gap: 16px;
  align-items: center;
}
/* 移动端适配：柱状排列 */
@media (max-width: 600px) {
  .header-container {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
