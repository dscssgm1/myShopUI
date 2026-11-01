import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // 前端统一走 /api 前缀，代理到网关
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
