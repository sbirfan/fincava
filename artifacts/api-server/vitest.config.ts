import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
          // Node environment for API tests (no browser DOM needed)
      environment: "node",
          globals: true,
          include: ["src/**/*.{test,spec}.{ts,mts}"],
          exclude: ["node_modules", "dist"],
          reporters: ["verbose"],
          outputFile: {
                  json: "./test-results/results.json",
          },
          coverage: {
                  provider: "v8",
                  reporter: ["text", "json", "html"],
                  exclude: [
                            "node_modules/",
                            "**/*.d.ts",
                            "**/*.config.*",
                            "dist/",
                            "src/test/",
                          ],
          },
          // Allow up to 10s for DB-heavy tests
          testTimeout: 10000,
          hookTimeout: 10000,
    },
});
