import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
    plugins: [react()],
    test: {
          // Use jsdom to simulate a browser environment for React components
      environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
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
                            "src/test/",
                            "**/*.d.ts",
                            "**/*.config.*",
                            "dist/",
                          ],
          },
    },
    resolve: {
          alias: {
                  "@": resolve(__dirname, "./src"),
          },
    },
});
