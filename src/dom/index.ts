/**
 * `modelpact-tools/dom`: the tools that read a page, and the kit that carries
 * them.
 *
 * A separate entry for the reason modelpact splits its own: these reach for
 * `document`, and the main entry runs in node. `makeWriteKit` will land here
 * too — the same environment, and adding an export is not a breaking change
 * where splitting the map would be.
 */
import { defineKit, type Kit } from "../kit.js";
import { type DomKitConfig } from "./config.js";
import { makeFindElementsTool } from "./find-elements.js";
import { makePageOutlineTool } from "./page-outline.js";
import { makePageTextTool } from "./page-text.js";
import { makeReadTableTool } from "./read-table.js";

export type { DomKitConfig } from "./config.js";
export { DOM_DEFAULTS } from "./config.js";
export { makeFindElementsTool } from "./find-elements.js";
export { makePageOutlineTool } from "./page-outline.js";
export { makePageTextTool } from "./page-text.js";
export { makeReadTableTool } from "./read-table.js";

export const makeReadKit = (config: DomKitConfig = {}): Kit =>
  defineKit("read", [
    makePageTextTool(config),
    makePageOutlineTool(config),
    makeFindElementsTool(config),
    makeReadTableTool(config),
  ]);

/**
 * Build the kits together, always. Separately-built kits get separate state —
 * today the config, from the handle registry on the same seam — and a handle
 * one kit hands out then fails to resolve in the other, silently.
 */
export const makeDomKits = (
  config: DomKitConfig = {},
): { readonly read: Kit } => ({ read: makeReadKit(config) });
