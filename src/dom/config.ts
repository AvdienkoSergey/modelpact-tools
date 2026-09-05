/**
 * One config for every tool in the DOM kits, and the numbers it defaults to.
 *
 * Flat and shared rather than per-tool: the kits are built together
 * ([index.ts](./index.ts)) so that what one tool produces the next can
 * resolve, and a per-tool config is where those drift apart.
 */
import type { RootConfig } from "../shared/root.js";

export interface DomKitConfig extends RootConfig {
  /** Ceiling on a tool's whole answer. Cuts are announced in the answer. */
  readonly maxChars?: number;
  /** Ceiling on how many headings, matches or rows one answer lists. */
  readonly maxItems?: number;
}

/**
 * `maxChars` matches the reference tool. `maxItems` is set so a listing tool's
 * answer stays roughly within it: 40 lines of a heading and a selector is
 * about 2 kB.
 */
export const DOM_DEFAULTS = { maxChars: 4_000, maxItems: 40 } as const;

export const charBudget = (config: DomKitConfig): number =>
  config.maxChars ?? DOM_DEFAULTS.maxChars;

export const itemBudget = (config: DomKitConfig): number =>
  config.maxItems ?? DOM_DEFAULTS.maxItems;
