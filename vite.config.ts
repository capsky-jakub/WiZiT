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
        banner: '/*! Copyright (C) 2026 Jakub Capsky. This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. */',
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