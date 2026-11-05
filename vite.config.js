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
      host: true,          // 监听 0.0.0.0，隧道从本机 127.0.0.1:5173 访问不受影响
      open: true,
      allowedHosts: true,  // 允许公网 Host（如 101.132.73.8:8080）通过 Host 校验
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
