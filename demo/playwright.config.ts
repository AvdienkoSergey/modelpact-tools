import { defineConfig } from "@playwright/test";

/**
 * One browser, because the package's ground is Chrome's built-in model and
 * everything under test here is DOM reading, not rendering.
 *
 * The suite needs no daemon and no weights: the `stub` provider in the picker
 * is `makeOllamaProvider` over a `fetch` that answers from
 * `src/stub-daemon.ts`, so a real tool round runs with nothing behind it.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://127.0.0.1:5174", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
