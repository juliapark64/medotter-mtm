import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative assets work for both repository Pages URLs and local previews.
  base: './',
  plugins: [react()],
})
