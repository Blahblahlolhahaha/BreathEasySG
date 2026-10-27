// Settings for Vite, the tool that runs and builds the app.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { global: "globalThis" },
  build: {
    rollupOptions: {
      output: {
        // Split big libraries into their own files so browsers can cache them separately.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          map: ["leaflet", "react-leaflet"],
          charts: ["recharts"],
        },
      },
    },
  },
});
