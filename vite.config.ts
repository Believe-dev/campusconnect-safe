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
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 3,
        unsafe: true,
        unsafe_comps: true,
        unsafe_Function: true,
        unsafe_math: true,
        unsafe_symbols: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
        dead_code: true,
        global_defs: {
          '@console.log': 'void',
          '@console.info': 'void',
          '@console.debug': 'void',
          '@console.warn': 'void',
        },
      },
      mangle: {
        toplevel: true,
        eval: true,
        keep_fnames: false,
        properties: {
          regex: /^_/,
        },
      },
      format: {
        comments: false,
        beautify: false,
        semicolons: false,
      },
      nameCache: {},
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
