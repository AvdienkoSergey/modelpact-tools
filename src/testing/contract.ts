/**
 * The rules every tool here obeys, written once and called for each of them.
 *
 * Mirrors `describeContract` from `modelpact/testing`, and takes the same hard
 * rule from it: what is asserted here may only be the contract, never one
 * implementation's habits. The proof of that is running it against
 * `makePageTextTool`, a tool written elsewhere — see
 * [dom/kit.test.ts](../dom/kit.test.ts).
 *
 * There is no assertion about having no page, because there is no need for
 * one: run the suite under `environment: "node"` and the fuzz below is that
 * assertion — a tool reaching for a `document` that is not there throws, and
 * throwing is what the fuzz forbids. See [dom/pageless.test.ts](../dom/pageless.test.ts).
 *
 * Nor one that a tool honours its `maxChars`: the budget is config the suite
 * cannot see, and every answer here is formatted by a pure function taking it
 * as an argument, so that belongs in the tool's own test where both are in
 * hand.
 */
import { jsonSchema, type Tool } from "modelpact";
import { describe, expect, test } from "vitest";

import { estimateRequestTokens, estimateToolTokens } from "../budget.js";
import type { Kit, ToolEntry } from "../kit.js";

/** Above the measured ~50 a tool costs, because the estimate runs high. */
const MAX_TOOL_TOKENS = 100;

/** Six per cent of Gemini Nano's 9 216, preamble included. */
const MAX_REQUEST_TOKENS = 600;

const MAX_NAME_CHARS = 24;
const MAX_DESCRIPTION_CHARS = 200;

/** Closed on purpose: a model reading the name must know what it is holding. */
const WRITE_VERBS = ["fill", "click", "submit", "set"];
const WRITE_MARKER = "Changes the page:";

const BAD_VALUES: readonly unknown[] = [
  null,
  0,
  -1,
  Number.NaN,
  false,
  true,
  "",
  "(((",
  "x".repeat(10_000),
  [],
  {},
];

export interface KitContractOptions {
  readonly maxRequestTokens?: number;
}

const propertiesOf = (tool: Tool): Record<string, unknown> => {
  const properties = tool.inputSchema.properties;
  return typeof properties === "object" && properties !== null
    ? (properties as Record<string, unknown>)
    : {};
};

/**
 * `JSON.parse` for the `__proto__` case: written as an object literal it would
 * set the prototype instead of making the own property an attacker sends.
 */
const hostileInputs = (tool: Tool): readonly Record<string, unknown>[] => {
  const inputs: Record<string, unknown>[] = [
    {},
    { unexpected: "surprise" },
    JSON.parse('{"__proto__":{"polluted":true}}') as Record<string, unknown>,
    { constructor: "surprise" },
  ];
  for (const name of Object.keys(propertiesOf(tool)))
    for (const value of BAD_VALUES) inputs.push({ [name]: value });
  return inputs;
};

const answer = async (
  tool: Tool,
  input: Record<string, unknown>,
  signal: AbortSignal,
): Promise<string> => {
  try {
    return await tool.execute(input, signal);
  } catch (error) {
    const shown = JSON.stringify(input).slice(0, 120);
    throw new Error(`threw on ${shown}`, { cause: error });
  }
};

const openSignal = (): AbortSignal => new AbortController().signal;

export const describeToolContract = (
  name: string,
  makeEntry: () => ToolEntry,
): void => {
  describe(name, () => {
    test("its arguments are a schema of a closed object", () => {
      const { tool } = makeEntry();
      expect(jsonSchema(tool.inputSchema)).not.toBeNull();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.additionalProperties).toBe(false);
    });

    test("every argument is described", () => {
      const { tool } = makeEntry();
      for (const [key, property] of Object.entries(propertiesOf(tool))) {
        const described = (property as Record<string, unknown>).description;
        expect(described, key).toBeTypeOf("string");
        expect(String(described).length, key).toBeGreaterThan(0);
      }
    });

    test("required names only declared arguments", () => {
      const { tool } = makeEntry();
      const required = tool.inputSchema.required;
      if (required === undefined) return;
      expect(Array.isArray(required)).toBe(true);
      const declared = Object.keys(propertiesOf(tool));
      for (const key of required as readonly unknown[])
        expect(declared).toContain(key);
    });

    test("its name is a short camelCase identifier", () => {
      const { tool } = makeEntry();
      expect(tool.name).toMatch(/^[a-z][A-Za-z0-9]*$/);
      expect(tool.name.length).toBeLessThanOrEqual(MAX_NAME_CHARS);
    });

    test("the name says whether it changes the page", () => {
      const entry = makeEntry();
      const verb = /^[a-z]+/.exec(entry.tool.name)?.[0] ?? "";
      if (entry.effect === "write") expect(WRITE_VERBS).toContain(verb);
      else expect(WRITE_VERBS).not.toContain(verb);
    });

    test("so does the description, where the model reads it", () => {
      const entry = makeEntry();
      const { description } = entry.tool;
      expect(description.length).toBeGreaterThan(0);
      expect(description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_CHARS);
      expect(description.startsWith(WRITE_MARKER)).toBe(
        entry.effect === "write",
      );
    });

    test(`it costs at most ${MAX_TOOL_TOKENS} tokens of window`, () => {
      expect(estimateToolTokens(makeEntry().tool)).toBeLessThanOrEqual(
        MAX_TOOL_TOKENS,
      );
    });

    test("no argument makes it throw, and every answer is a sentence", async () => {
      const { tool } = makeEntry();
      for (const input of hostileInputs(tool)) {
        const said = await answer(tool, input, openSignal());
        const shown = JSON.stringify(input).slice(0, 120);
        expect(said, shown).toBeTypeOf("string");
        expect(said.length, shown).toBeGreaterThan(0);
      }
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    /**
     * Vacuous for a synchronous tool, which cannot be interrupted and does not
     * pretend to be. It stops being vacuous at `waitFor`.
     */
    test("an aborted signal does not hang it", async () => {
      const { tool } = makeEntry();
      const controller = new AbortController();
      controller.abort();
      expect(await answer(tool, {}, controller.signal)).toBeTypeOf("string");
    });
  });
};

export const describeKitContract = (
  name: string,
  makeKit: () => Kit,
  options: KitContractOptions = {},
): void => {
  const kit = makeKit();
  describe(name, () => {
    test("no two tools share a name", () => {
      const names = kit.entries.map((entry) => entry.tool.name);
      expect(new Set(names).size).toBe(names.length);
    });

    test("its tools are its entries' tools, in order", () => {
      expect(kit.tools).toEqual(kit.entries.map((entry) => entry.tool));
    });

    test("the whole kit fits a window", () => {
      expect(estimateRequestTokens(kit.tools)).toBeLessThanOrEqual(
        options.maxRequestTokens ?? MAX_REQUEST_TOKENS,
      );
    });

    for (const entry of kit.entries)
      describeToolContract(entry.tool.name, () => entry);
  });
};
