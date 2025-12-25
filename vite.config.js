import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use root path for Netlify, GitHub Pages path for GitHub Actions
  base: process.env.NETLIFY ? '/' : '/parse-and-track-spending/',
})
