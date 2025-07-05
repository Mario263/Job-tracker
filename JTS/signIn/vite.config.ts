
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { 'process.env': {} },
  base: '/signin/',
  build: {
    outDir: '../signin-dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: false,
  },
});