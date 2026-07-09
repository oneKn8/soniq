import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Ensure the DOM is torn down between tests so component renders never leak
// into one another.
afterEach(() => {
  cleanup();
});
