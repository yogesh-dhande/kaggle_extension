import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    minify: false,
    sourcemap: true
  },
  resolve: {
    alias: {
      'node:async_hooks': resolve(__dirname, 'src/polyfills/async-hooks.ts')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
});
