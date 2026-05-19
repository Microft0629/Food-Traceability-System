// 应用入口：创建 Vue 实例，顺序挂载 Pinia 状态管理 与 Vue Router
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./assets/style.css";

// 创建 Vue 应用实例
const app = createApp(App);

// Pinia 必须先于 Router 注册，确保路由守卫中可以访问 store
app.use(createPinia());
app.use(router);

// 挂载到 #app DOM 节点
app.mount("#app");
