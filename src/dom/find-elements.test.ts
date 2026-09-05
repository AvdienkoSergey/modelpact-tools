/**
 * @vitest-environment jsdom
 */
import { expect, test } from "vitest";

import type { ToolEntry } from "../kit.js";
import { makeFindElementsTool } from "./find-elements.js";

const run = async (
  entry: ToolEntry,
  input: Record<string, unknown>,
): Promise<string> => entry.tool.execute(input, new AbortController().signal);

const page = (html: string): Document => {
  document.body.innerHTML = html;
  return document;
};

test("each match gets a number, a tag, its text and a selector", async () => {
  const root = page(`
    <button id="pay">Continue to payment</button>
    <button name="cancel">Cancel</button>
  `);
  const said = await run(makeFindElementsTool({ root }), {
    selector: "button",
  });

  expect(said).toContain('2 matches for "button":');
  expect(said).toContain('1. button "Continue to payment" [#pay]');
  expect(said).toContain('2. button "Cancel" [button[name="cancel"]]');
});

test("attributes worth telling apart are reported, flags as bare words", async () => {
  const root = page(
    `<input name="email" type="email" placeholder="you@example.com" required>
     <button disabled>Send</button>`,
  );
  const said = await run(makeFindElementsTool({ root }), {
    selector: "input, button",
  });

  expect(said).toContain("name=email");
  expect(said).toContain("type=email");
  expect(said).toContain("placeholder=you@example.com");
  expect(said).toContain("required");
  expect(said).toContain("disabled");
});

test("a match with no stable selector is still listed", async () => {
  const root = page("<ul><li>One</li><li>Two</li></ul>");
  const said = await run(makeFindElementsTool({ root }), { selector: "li" });

  expect(said).toContain('1. li "One"');
  expect(said).not.toContain("[");
});

test("the limit is honoured and the total is still reported", async () => {
  const root = page(
    Array.from({ length: 9 }, (_, n) => `<span>${n}</span>`).join(""),
  );
  const said = await run(makeFindElementsTool({ root }), {
    selector: "span",
    limit: 2,
  });

  expect(said).toContain('9 matches for "span", showing 2:');
  expect(said).toContain('2. span "1"');
  expect(said).not.toContain('3. span "2"');
});

test("maxItems is the ceiling the model cannot raise", async () => {
  const root = page(
    Array.from({ length: 9 }, (_, n) => `<span>${n}</span>`).join(""),
  );
  const said = await run(makeFindElementsTool({ root, maxItems: 3 }), {
    selector: "span",
    limit: 100,
  });

  expect(said).toContain("showing 3:");
});

test("every mistake in the arguments is a sentence", async () => {
  const root = page("<p>Nothing to find.</p>");
  const entry = makeFindElementsTool({ root });

  expect(await run(entry, { selector: "button" })).toBe(
    'nothing on the page matches "button"',
  );
  expect(await run(entry, { selector: ">>>" })).toBe(
    '">>>" is not a valid CSS selector',
  );
  expect(await run(entry, { selector: "" })).toBe("selector must not be empty");
  expect(await run(entry, {})).toBe("selector must be a string");
  expect(await run(entry, { selector: "p", limit: "five" })).toBe(
    "limit must be a number",
  );
  expect(await run(entry, { selector: "p", limit: 0 })).toBe(
    "limit must be at least 1",
  );
});
