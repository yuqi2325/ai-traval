import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    // DevTools 只在本地开发时启用，避免影响生产构建
    command === 'serve' && vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 开发/预览时把 /api 转发到本地后端，前端用相对路径请求，避免跨域与混合内容问题
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3200',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3200',
        changeOrigin: true,
      },
    },
  },
}))
