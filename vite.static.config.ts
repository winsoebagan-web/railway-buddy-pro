/**
 * Static SPA build for Capacitor.
 *   npm run build:static  ->  dist/index.html + dist/assets/*
 *
 * This bypasses TanStack Start's SSR/nitro pipeline entirely and produces a
 * plain client-rendered bundle with relative asset paths (file:// friendly).
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./static", import.meta.url)),
  base: "./",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  plugins: [tsConfigPaths({ root: fileURLToPath(new URL(".", import.meta.url)) }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
});
