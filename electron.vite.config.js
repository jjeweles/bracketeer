import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      // tell Rollup/Vite to emit a CommonJS lib
      lib: {
        entry: resolve(__dirname, 'src/main.js')
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    build: {
      // tell Rollup/Vite to emit a CommonJS lib
      lib: {
        entry: resolve(__dirname, 'src/preload.js'),
        formats: ['cjs'],
        fileName: () => 'index.js' // override extension
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
