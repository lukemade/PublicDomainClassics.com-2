import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'aap-v-kennedy': resolve(__dirname, 'docs/aap-v-kennedy/index.html'),
      },
    },
  },
})
