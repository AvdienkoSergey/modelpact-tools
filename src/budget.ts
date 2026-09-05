/**
 * What a tool costs before it has answered anything.
 *
 * Tools are loaded into the window at open, so their text is subtracted from
 * the room left for the conversation. modelpact measures about 50 tokens for
 * one tool with a one-sentence description, plus 100 to 200 for the preamble,
 * against Gemini Nano's 9 216 — eight tools are five per cent of that window,
 * thirty-two are a fifth.
 *
 * The estimate below runs high against that measurement, because four
 * characters per token is generous to JSON punctuation, which tokenises
 * denser. That is the direction to be wrong in for a budget, and the caps in
 * [testing/contract.ts](./testing/contract.ts) are set against these numbers,
 * not against the measured ones.
 */
import type { Tool } from "modelpact";

const CHARS_PER_TOKEN = 4;

/** Instructions the backend adds around the tool list, once per request. */
export const PREAMBLE_TOKENS = 150;

export const estimateToolTokens = (tool: Tool): number =>
  Math.ceil(
    (tool.name.length +
      tool.description.length +
      JSON.stringify(tool.inputSchema).length) /
      CHARS_PER_TOKEN,
  );

/** The preamble is charged once, so an empty request costs nothing. */
export const estimateRequestTokens = (tools: readonly Tool[]): number =>
  tools.length === 0
    ? 0
    : PREAMBLE_TOKENS +
      tools.reduce((total, tool) => total + estimateToolTokens(tool), 0);
