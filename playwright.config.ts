import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  outputDir: ".browser-tests/results",
  webServer: {
    command: "npm run dev -- --port 5180 --strictPort",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://127.0.0.1:5180",
    launchOptions: { channel: "msedge" },
  },
  reporter: "list",
});
