// 路由配置
import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";
import ProducerPanel from "../views/ProducerPanel.vue";
import ConsumerQuery from "../views/ConsumerQuery.vue";
import AdminPanel from "../views/AdminPanel.vue";

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

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
