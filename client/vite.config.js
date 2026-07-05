import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/main.jsx', 'eslint.config.js'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 75 // <--- Set to the React standard of 75%
      }
    }
  }
})