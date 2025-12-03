import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-renderer',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    },
    copyPublicDir: true
  },
  publicDir: 'src/images',
  server: {
    port: 5173
  }
});
