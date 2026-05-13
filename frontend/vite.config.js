import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 把 @ 指向 src 目录
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173, // 固定端口
    open: true, // 启动后自动打开浏览器
  },
});
