import { defineConfig as defineViteConfig, mergeConfig } from "vite";
import { defineConfig as defineVitestConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const viteConfig = defineViteConfig({
  plugins: [react()],
  server: { port: 5173 },
});

const vitestConfig = defineVitestConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.tsx"],
  },
});

export default mergeConfig(viteConfig, vitestConfig);
