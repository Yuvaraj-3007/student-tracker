import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: false,
    open: false,
    watch: {
      usePolling: true,
      interval: 400
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
