/**
 * Which tools go into the window this turn.
 *
 * This — not the `exports` map — is what bounds the cost. Everything imported
 * is free until it is in the array handed to `provider.access`, so a kit is a
 * shelf and this is the picking.
 */
import type { Tool } from "modelpact";

import type { Kit, ToolEffect, ToolEntry } from "./kit.js";

export interface Selection {
  /** Names, in the order given: a preset, or your own list. */
  readonly only?: readonly string[];
  readonly except?: readonly string[];
  /** Narrow by effect. Omit for both. */
  readonly effect?: ToolEffect;
  /** Hard cap, applied last, in selection order. */
  readonly maxTools?: number;
}

const index = (kits: readonly Kit[]): Map<string, ToolEntry> => {
  const byName = new Map<string, ToolEntry>();
  for (const kit of kits)
    for (const entry of kit.entries) {
      if (byName.has(entry.tool.name))
        throw new Error(
          `two kits name "${entry.tool.name}"; a backend dispatches by name and would reach only one`,
        );
      byName.set(entry.tool.name, entry);
    }
  return byName;
};

/**
 * Throws on a name it cannot find — the one place in the package that throws
 * rather than answering in prose.
 *
 * The prose rule is about `execute`, where the input comes from a model that
 * can read the answer and correct itself. This input comes from a developer at
 * wiring time, and silence there means a tool quietly missing from the window
 * while the model looks stupid for a week.
 *
 * `except` is the asymmetric case and does not throw: excluding something
 * absent is already satisfied, and a preset that spans kits is a fair thing to
 * subtract from one of them.
 */
export const selectTools = (
  kits: readonly Kit[],
  selection: Selection = {},
): readonly Tool[] => {
  const byName = index(kits);
  const { only, except, effect, maxTools } = selection;

  let chosen: ToolEntry[];
  if (only === undefined) {
    chosen = [...byName.values()];
  } else {
    chosen = only.map((name) => {
      const entry = byName.get(name);
      if (entry === undefined)
        throw new Error(
          `no tool named "${name}" in ${kits.map((kit) => kit.name).join(", ")}`,
        );
      return entry;
    });
  }

  if (except !== undefined) {
    const dropped = new Set(except);
    chosen = chosen.filter((entry) => !dropped.has(entry.tool.name));
  }
  if (effect !== undefined)
    chosen = chosen.filter((entry) => entry.effect === effect);

  const tools = chosen.map((entry) => entry.tool);
  return maxTools === undefined ? tools : tools.slice(0, Math.max(0, maxTools));
};
