import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// No need to import tailwindcss here. Tailwind is handled via PostCSS config.
export default defineConfig({
  plugins: [vue()],
})
