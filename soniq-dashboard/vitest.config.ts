import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit-test config for the Soniq dashboard.
// Runs in jsdom with React Testing Library. Never touches a database or a
// running backend: only pure helpers and presentational components are covered.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
    css: false,
    restoreMocks: true,
  },
});
