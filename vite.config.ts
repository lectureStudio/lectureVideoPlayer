import { defineConfig } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    // Inline all JS/CSS/assets into a single index.html on build
    viteSingleFile(),
  ],
  resolve: {
    // Path aliases for cleaner imports
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@schemas': fileURLToPath(new URL('./src/schemas', import.meta.url)),
    },
  },
  build: {
    // Configuration to ensure single-file output
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100000000, // ~100MB to inline small assets
    reportCompressedSize: false,
    target: 'es2018',
    rollupOptions: {
      external: (id) => {
        // Exclude video files from bundling (they should be external)
        return /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/i.test(id)
      },
    },
  },
  test: {
    // Test configuration for Vitest
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
