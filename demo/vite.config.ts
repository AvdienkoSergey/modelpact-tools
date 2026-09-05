import { defineConfig } from "vite";

/**
 * Bound to `127.0.0.1` and not to `localhost`: the name can resolve to the
 * IPv6 loopback first, and Playwright's `webServer` then waits out its timeout
 * against a port nothing answers on. modelpact's Ollama config carries the
 * same note for the same reason.
 */
export default defineConfig({
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
  preview: { host: "127.0.0.1", port: 5174, strictPort: true },
});
