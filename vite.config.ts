import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './', // Ensures assets are loaded relative to the file, not root
  build: {
    cssCodeSplit: false, // Inline CSS into the bundle
    assetsInlineLimit: 100000000, // Inline all assets regardless of size
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable chunk splitting
      },
    },
  },
  preview: {
    host: true, 
    port: 8080
  },
  server: {
    host: true,
    port: 8080
  }
});