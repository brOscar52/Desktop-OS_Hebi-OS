import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@os/sdk': resolve('src/renderer/src/os/sdk'),
        '@os/ui': resolve('src/renderer/src/os/ui'),
        '@system': resolve('src/renderer/src/system'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
