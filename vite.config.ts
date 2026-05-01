import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Use relative asset paths to avoid blank-page issues on GitHub Pages
  // when repository name / base path differs.
  base: './',
  plugins: [react()],
});
