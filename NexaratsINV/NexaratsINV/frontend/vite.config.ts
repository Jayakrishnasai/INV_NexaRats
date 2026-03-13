import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // ── Vendor chunk splitting ──────────────────────────────────────
        manualChunks(id) {
          // React core — loaded first, always cached
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // React Router — only needed for app shell
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) {
            return 'vendor-router';
          }
          // Recharts — heavy, only needed on Dashboard/Analytics pages
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }
          // Framer Motion — heavy, only needed per-component
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // Lucide icons — large icon set
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Axios + retry
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }
          // zod, clsx, class-variance-authority, tailwind-merge
          if (id.includes('node_modules/zod') || id.includes('node_modules/clsx') || id.includes('node_modules/class-variance-authority') || id.includes('node_modules/tailwind-merge')) {
            return 'vendor-utils';
          }
        },
        // Content-hash filenames for long-term caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
