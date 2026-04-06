import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globals: true,
    setupFiles: ["./tests/global/integration-setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "./tests/helpers/server-only-stub.ts"),
    },
  },
});
