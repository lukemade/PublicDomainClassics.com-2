import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        frankenstein: resolve(__dirname, 'books/frankenstein/index.html'),
        'moby-dick': resolve(__dirname, 'books/moby-dick/index.html'),
      },
    },
  },
})
