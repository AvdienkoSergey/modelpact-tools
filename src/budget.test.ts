import { expect, test } from "vitest";
import type { Tool } from "modelpact";

import {
  estimateRequestTokens,
  estimateToolTokens,
  PREAMBLE_TOKENS,
} from "./budget.js";
import { argumentsSchema } from "./shared/schema.js";

const tool = (description: string): Tool => ({
  name: "stub",
  description,
  inputSchema: argumentsSchema({
    type: "object",
    properties: {},
    additionalProperties: false,
  }),
  execute: () => "",
});

test("a chattier description costs more", () => {
  const terse = estimateToolTokens(tool("Read the page."));
  const wordy = estimateToolTokens(
    tool("Read the page, which is to say the text a person would see on it."),
  );

  expect(wordy).toBeGreaterThan(terse);
});

test("the preamble is charged once, not once per tool", () => {
  const one = tool("Read the page.");
  const request = estimateRequestTokens([one, one]);

  expect(request).toBe(PREAMBLE_TOKENS + 2 * estimateToolTokens(one));
});

test("no tools cost no window at all", () => {
  expect(estimateRequestTokens([])).toBe(0);
});
