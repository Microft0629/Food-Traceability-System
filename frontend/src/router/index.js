/**
 * Vue Router 路由配置
 * / -> 首页  /producer -> 生产商  /consumer -> 消费者  /admin -> 管理员
 */
import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";
import ProducerPanel from "../views/ProducerPanel.vue";
import ConsumerQuery from "../views/ConsumerQuery.vue";
import AdminPanel from "../views/AdminPanel.vue";

// 路由表：四个顶层页面
const routes = [
  {
    path: "/",
    name: "Home",
    component: HomePage,
  },
  {
    path: "/producer",
    name: "Producer",
    component: ProducerPanel,
  },
  {
    path: "/consumer",
    name: "Consumer",
    component: ConsumerQuery,
  },
  {
    path: "/admin",
    name: "Admin",
    component: AdminPanel,
  },
];

// 使用 HTML5 History 模式创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
