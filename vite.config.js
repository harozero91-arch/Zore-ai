import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
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
