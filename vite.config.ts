import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize build for faster compilation
  build: {
    // Target modern browsers for smaller bundle
    target: 'esnext',
    // Enable minification
    minify: 'esbuild',
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip'
          ],
          'firebase-vendor': ['firebase/app', 'firebase/firestore'],
          'clerk-vendor': ['@clerk/clerk-react'],
          'ai-vendor': ['@google/generative-ai', 'axios'],
        },
      },
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging (disable for faster builds)
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/firestore',
      '@clerk/clerk-react',
      'framer-motion'
    ],
  },
  // Development server optimizations
  server: {
    cors: true,
    fs: {
      strict: false
    },
    hmr: {
      overlay: true,
    },
  },
  // Performance hints
  esbuild: {
    // Remove console logs in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
