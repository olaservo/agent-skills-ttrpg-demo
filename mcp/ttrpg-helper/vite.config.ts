import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const INPUT = process.env.INPUT;
// Vitest auto-loads vite.config.ts; don't require INPUT in that case.
if (!INPUT && !process.env.VITEST) {
  throw new Error("INPUT environment variable is not set");
}

const isDevelopment = process.env.NODE_ENV === "development";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    sourcemap: isDevelopment ? "inline" : undefined,
    cssMinify: !isDevelopment,
    minify: !isDevelopment,

    rollupOptions: INPUT ? { input: INPUT } : undefined,
    outDir: "dist",
    emptyOutDir: false,
  },
});
