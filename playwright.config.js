import { defineConfig } from "@playwright/test";

const shouldStartWebServer = !process.env.PLAYWRIGHT_SKIP_WEB_SERVER;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: shouldStartWebServer
    ? {
        command: "npm run dev -- --host 0.0.0.0 --port 4173",
        url: "http://localhost:4173",
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
