<!-- src/components/LayoutHeader.vue -->
<template>
  <header class="header">
    <div class="header-container">
      <div class="logo">
        <router-link to="/" class="logo-link">🍅 食品溯源</router-link>
      </div>
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
@media (max-width: 600px) {
  .header-container {
    flex-direction: column;
    gap: 10px;
  }
}
</style>// 全局头部导航
// 全局头部导航
