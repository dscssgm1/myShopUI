import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    // 部署前缀：.env.prod 中 VITE_BASE=/myShopUI/，dev 模式默认 /
    base: env.VITE_BASE || '/',
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
    },
    build: {
      outDir: env.VITE_OUT_DIR || 'dist'
    }
  }
})
