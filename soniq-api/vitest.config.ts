import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Unit tests only: no DB, no network. DB access is mocked per-file.
    globals: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
