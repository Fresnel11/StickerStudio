import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  outputDir: ".browser-tests/results",
  webServer: {
    command: "node ../backend/scripts/dev-all.mjs --port 5180",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: false,
    env: {
      API_PORT: "3002",
      API_TARGET: "http://127.0.0.1:3002",
      USE_TEST_DATABASE: "1",
      DATABASE_SCHEMA: `e2e_${Date.now()}`,
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
    },
  },
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5180",
    launchOptions: { channel: "msedge" },
  },
  reporter: "list",
});
