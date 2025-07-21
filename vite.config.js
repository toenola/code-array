import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        preload: resolve(__dirname, 'public/preload/services.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'preload') {
            return 'preload/services.js'
          }
          return '[name]-[hash].js'
        }
      }
    },
    // 确保 public 文件夹内容被复制
    copyPublicDir: true
  }
})
