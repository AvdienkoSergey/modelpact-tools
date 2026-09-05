/**
 * What a tool is here: the contract's `Tool`, plus what the contract has no
 * room for.
 *
 * `Tool` is four readonly fields and modelpact's thirteenth principle keeps it
 * that way — a schema and a function, not a bag of fields. Anything the
 * package needs to know about a tool therefore sits beside it in a `ToolEntry`
 * rather than on it, and never reaches `ModelRequest.tools` as dead weight.
 *
 * A `Kit` is a named set of entries. Which kit a tool is in says what it can
 * do to the page; which preset names it says what task it is for. Those are
 * different questions, so they are different mechanisms — see
 * [presets.ts](./presets.ts) and [select.ts](./select.ts).
 */
import type { Tool } from "modelpact";

/** Whether the tool changes the page. The kit boundary, and the guard's. */
export type ToolEffect = "read" | "write";

export interface ToolEntry {
  readonly tool: Tool;
  readonly effect: ToolEffect;
  /** Absent unless the tool is dead without setup the app does at boot. */
  readonly needs?: "recorder";
}

export interface Kit {
  readonly name: string;
  readonly entries: readonly ToolEntry[];
  /** `entries.map((entry) => entry.tool)`, for `ModelRequest.tools`. */
  readonly tools: readonly Tool[];
}

/**
 * Two constructors rather than an object literal: an effect that can be
 * omitted is a safety flag that can be forgotten, and this one decides whether
 * a guard runs.
 */
export const readEntry = (tool: Tool, needs?: "recorder"): ToolEntry =>
  needs === undefined
    ? { tool, effect: "read" }
    : { tool, effect: "read", needs };

export const writeEntry = (tool: Tool): ToolEntry => ({
  tool,
  effect: "write",
});

/**
 * Throws on a repeated name. The backend dispatches a call by string match
 * (`findTool` in modelpact's `helpers/tools.js`), so a duplicate is not a
 * style problem — the second tool is unreachable, silently.
 */
export const defineKit = (name: string, entries: readonly ToolEntry[]): Kit => {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.tool.name))
      throw new Error(`kit "${name}" names "${entry.tool.name}" twice`);
    seen.add(entry.tool.name);
  }
  return {
    name,
    entries,
    tools: entries.map((entry) => entry.tool),
  };
};
