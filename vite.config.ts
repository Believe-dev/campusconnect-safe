import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import removeConsole from "vite-plugin-remove-console";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    removeConsole(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: (chunkInfo) => {
          const hash = Math.random().toString(36).substring(2, 15);
          return `assets/${hash}.js`;
        },
        chunkFileNames: (chunkInfo) => {
          const hash = Math.random().toString(36).substring(2, 15);
          return `assets/${hash}.js`;
        },
        assetFileNames: (assetInfo) => {
          const hash = Math.random().toString(36).substring(2, 15);
          const ext = assetInfo.name?.split('.').pop();
          return `assets/${hash}.${ext}`;
        },
      },
    },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
}));
