import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to 0.0.0.0 instead of just localhost so devices on the same
    // Wi-Fi (like your phone) can reach the dev server.
    host: true,
    port: 5173,
    strictPort: true,
  },
});
