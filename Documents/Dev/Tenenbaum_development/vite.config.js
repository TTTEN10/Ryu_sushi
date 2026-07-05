import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the Express backend during development.
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split vendor libraries for better long-term caching + code splitting.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils"))
            return "motion";
          if (id.includes("lenis")) return "smooth";
          if (
            id.includes("react-router") ||
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("scheduler")
          )
            return "react";
          return "vendor";
        },
      },
    },
  },
});
