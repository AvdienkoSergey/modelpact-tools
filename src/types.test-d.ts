/**
 * The states this package refuses to represent, checked by the compiler.
 *
 * Under the project tsconfig's `include` and outside vitest's glob, so
 * `npm run typecheck` is what runs it — the arrangement modelpact uses for its
 * own thirteen principles. Every `@ts-expect-error` below is an assertion: the
 * build breaks if the line starts compiling.
 */
import type { Tool } from "modelpact";

import {
  defineKit,
  readEntry,
  writeEntry,
  type Kit,
  type ToolEntry,
} from "./kit.js";
import { selectTools } from "./select.js";
import { argumentsSchema } from "./shared/schema.js";

const schema = argumentsSchema({
  type: "object",
  properties: {},
  additionalProperties: false,
});

const tool: Tool = {
  name: "stub",
  description: "A stub.",
  inputSchema: schema,
  execute: () => "",
};

const entry: ToolEntry = readEntry(tool);
const kit: Kit = defineKit("read", [entry, writeEntry(tool)]);

// @ts-expect-error a schema is not just any object: `argumentsSchema` is the only way to one
export const notASchema: Tool = { ...tool, inputSchema: { type: "object" } };

/**
 * An entry is not a tool. If it were, it would reach `ModelRequest.tools`
 * carrying an effect flag no backend has a use for.
 */
// @ts-expect-error an entry carries a tool, it is not one
export const entryAsTool: Tool = entry;

// @ts-expect-error a tool carries no effect of its own; the flag lives beside it
export const effectOnTool: string = tool.effect;

/** The kit's tools are the request's array, and nothing appends to them. */
export const noAppending = (): void => {
  // @ts-expect-error a kit's tools are readonly, so nothing appends to them
  kit.tools.push(tool);
  // @ts-expect-error a selection is readonly for the same reason
  selectTools([kit]).push(tool);
  // @ts-expect-error an entry's effect is fixed when the entry is made
  entry.effect = "write";
};

/**
 * An effect is chosen by calling `readEntry` or `writeEntry`. Written out as a
 * literal it could be misspelt, or left out of a tool that changes the page.
 */
// @ts-expect-error the effect is a closed pair, not any string
export const madeUpEffect: ToolEntry = { tool, effect: "maybe" };

// @ts-expect-error `needs` is a closed set, not a free-text note
export const madeUpNeed: ToolEntry = { tool, effect: "read", needs: "a db" };
