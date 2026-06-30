import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      all: false,
      include: ["src/lib/**/*.ts"],
      // types.ts es solo declaraciones de tipos (sin código ejecutable).
      exclude: ["src/lib/types.ts"],
      reporter: ["text", "text-summary"],
      thresholds: {
        statements: 100,
        lines: 100,
        functions: 100,
      },
    },
  },
});
