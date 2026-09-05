/**
 * @vitest-environment jsdom
 */
import { expect, test } from "vitest";

import type { ToolEntry } from "../kit.js";
import { makePageTextTool } from "./page-text.js";

const run = async (
  entry: ToolEntry,
  input: Record<string, unknown> = {},
): Promise<string> => entry.tool.execute(input, new AbortController().signal);

const page = (html: string): Document => {
  document.body.innerHTML = html;
  return document;
};

test("runs of space go, but one blank line stays a paragraph break", async () => {
  const root = page("<h1>Checkout</h1>\n\n\n   <p>Two   items.</p>");

  expect(await run(makePageTextTool({ root }))).toBe("Checkout\n\nTwo items.");
});

test("a selector narrows it to one element", async () => {
  const root = page(
    "<main id='m'><p>Inside</p></main><footer>Outside</footer>",
  );
  const said = await run(makePageTextTool({ root }), { selector: "#m" });

  expect(said).toBe("Inside");
});

test("a page with nothing visible says so rather than answering blank", async () => {
  const root = page("");

  expect(await run(makePageTextTool({ root }))).toBe(
    "the page has no visible text",
  );
});

test("long text is cut and the cut is announced", async () => {
  const root = page(`<p>${"word ".repeat(100)}</p>`);
  const said = await run(makePageTextTool({ root, maxChars: 40 }));

  expect(said).toContain("…[cut: 40 of ");
});

test("every mistake in the arguments is a sentence", async () => {
  const root = page("<p>Hello</p>");
  const entry = makePageTextTool({ root });

  expect(await run(entry, { selector: "#gone" })).toBe(
    'nothing on the page matches "#gone"',
  );
  expect(await run(entry, { selector: "(((" })).toBe(
    '"(((" is not a valid CSS selector',
  );
  expect(await run(entry, { selector: 7 })).toBe("selector must be a string");
});
