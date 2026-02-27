import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: 'all', // Allow ngrok and other tunnel hosts in dev
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});