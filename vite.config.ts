import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // 添加代理配置解决CORS问题
  server: {
    port: 5173, // 明确指定端口
    proxy: {
      // 将请求代理到后端服务器
      '/api': {
        target: 'http://localhost:3000', // 后端服务器地址
        changeOrigin: true, // 改变请求头中的Origin为目标URL
        rewrite: (path) => path.replace(/^\/api/, ''), // 移除路径中的/api前缀
        secure: false, // 接受无效证书
        ws: true, // 支持websocket
        configure: (proxy, options) => {
          // 添加代理事件监听器，便于调试
          proxy.on('error', (err, req, res) => {
            console.error('代理错误:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`代理请求: ${req.method} ${req.url} -> ${proxyReq.method} ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`代理响应: ${req.url} -> 状态码: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
          });
        }
      }
    },
    cors: true // 允许跨域请求
  }
})
