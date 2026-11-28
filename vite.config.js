import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: "index.html",
        babylonPreview: "babylon-preview.html"
      },
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/@babylonjs/")) {
            return "babylon-vendor";
          }

          if (id.includes("/node_modules/three/")) {
            return "three-vendor";
          }

          if (id.includes("/node_modules/@supabase/")) {
            return "supabase-vendor";
          }

          if (id.includes("/node_modules/mp4-muxer/")) {
            return "video-vendor";
          }
        }
      }
    }
  }
});
