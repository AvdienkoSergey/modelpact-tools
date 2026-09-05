/**
 * The registry: the one place a backend is named.
 *
 * `stub` is the default because it is the only one that answers on any box —
 * `makeOllamaProvider` over [stubDaemonFetch](./stub-daemon.ts), so the tool
 * round is real and the daemon is not. The other two need something on the
 * machine, and their `unavailable` branch is worth seeing too.
 */
import { defineProviders } from "modelpact";
import { makeOllamaProvider, makePromptApiProvider } from "modelpact-providers";

import { stubDaemonFetch, STUB_MODEL } from "./stub-daemon.js";

export const PROVIDERS = defineProviders({
  stub: makeOllamaProvider({ model: STUB_MODEL, fetch: stubDaemonFetch }),
  ollama: makeOllamaProvider({ model: "granite4:350m" }),
  "prompt-api": makePromptApiProvider(),
});

export type DemoProviderName = keyof typeof PROVIDERS;

export const PROVIDER_NAMES = Object.keys(PROVIDERS) as DemoProviderName[];
