import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.js"),
      name: "SolarScanner",
      fileName: "solar-widget",
    },
    rollupOptions: {
      // Ensure Vue is bundled (not external) for embeddable widget
      external: [],
      output: {
        globals: {},
      },
    },
  },
  define: {
    "process.env": {},
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/solar-api": {
        target: "http://localhost:3000", // Your actual server URL
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
