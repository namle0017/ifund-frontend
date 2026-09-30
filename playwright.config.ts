import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against a running stack: BE dev host (InMemory + SYNTHETIC seed, demo accounts) and the FE production build.
 * Local: start `be-dev` and `fe-prod` (see ../.claude/launch.json) then `npm run e2e`.
 * Uses the installed Microsoft Edge channel so no browser download is needed on Windows dev machines.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    channel: process.env.E2E_CHANNEL ?? "msedge",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel: process.env.E2E_CHANNEL ?? "msedge" }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, testMatch: /mobile\.spec\.ts/ },
  ],
});
