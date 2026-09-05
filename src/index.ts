/**
 * The package: tools a model can call, and the machinery for choosing which of
 * them go into the window.
 *
 * Two ways in. An app takes a kit from `modelpact-tools/dom` and picks from it
 * with `selectTools`; a tool written elsewhere is held to the same rules by
 * `modelpact-tools/testing`. This entry is the part that runs in node — it
 * names no global, so an app that only wires kits together never loads a
 * `document`.
 *
 * A kit says what a tool may do to the page; a preset says what task it is
 * for. Those cross, which is why neither is the other: `formFields` reads and
 * `fillField` writes, and both are what anyone means by "forms".
 */
export {
  defineKit,
  readEntry,
  writeEntry,
  type Kit,
  type ToolEffect,
  type ToolEntry,
} from "./kit.js";
export {
  estimateRequestTokens,
  estimateToolTokens,
  PREAMBLE_TOKENS,
} from "./budget.js";
export { INSPECT } from "./presets.js";
export { selectTools, type Selection } from "./select.js";
export { resolveRoot, type RootConfig } from "./shared/root.js";
export {
  cutToFit,
  noMatch,
  notASelector,
  notAString,
  NO_PAGE,
  shorten,
  tidyWhitespace,
} from "./shared/prose.js";
export { argumentsSchema } from "./shared/schema.js";
export { stableSelector } from "./shared/selector.js";
export { findAll, findTarget } from "./shared/target.js";
