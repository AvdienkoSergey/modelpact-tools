/**
 * @vitest-environment jsdom
 */
import { expect, test } from "vitest";

import type { ToolEntry } from "../kit.js";
import { formatOutline, makePageOutlineTool } from "./page-outline.js";

const run = async (
  entry: ToolEntry,
  input: Record<string, unknown> = {},
): Promise<string> => entry.tool.execute(input, new AbortController().signal);

const page = (html: string): Document => {
  document.body.innerHTML = html;
  return document;
};

test("the heading tree carries a selector for each heading", async () => {
  const root = page(`
    <h1 id="top">Checkout</h1>
    <h2 id="shipping">Shipping address</h2>
    <h3 data-testid="card">Card details</h3>
  `);
  const said = await run(makePageOutlineTool({ root }));

  expect(said).toContain("h1 Checkout  [#top]");
  expect(said).toContain("  h2 Shipping address  [#shipping]");
  expect(said).toContain('    h3 Card details  [[data-testid="card"]]');
});

test("indentation starts at the shallowest heading present", async () => {
  const root = page("<h2 id='a'>One</h2><h3 id='b'>Two</h3>");
  const said = await run(makePageOutlineTool({ root }));

  expect(said).toContain("h2 One  [#a]");
  expect(said).toContain("  h3 Two  [#b]");
});

test("a generated id is not offered as a selector", async () => {
  const root = page("<h1 id=':r1:'>React</h1><h2 id='mui-12345'>Emotion</h2>");
  const said = await run(makePageOutlineTool({ root }));

  expect(said).toContain("h1 React");
  expect(said).not.toContain(":r1:");
  expect(said).not.toContain("mui-12345");
});

test("the title and address come from the page, not the scoped element", async () => {
  const root = page(
    "<section id='part'><h2>Inside</h2></section><h1>Outside</h1>",
  );
  document.title = "Checkout";
  const said = await run(makePageOutlineTool({ root }), { selector: "#part" });

  expect(said).toContain("title: Checkout");
  expect(said).toContain("h2 Inside");
  expect(said).not.toContain("Outside");
});

test("a page with no headings says so", async () => {
  const root = page("<p>Just prose.</p>");
  expect(await run(makePageOutlineTool({ root }))).toContain("no headings");
});

test("a selector that matches nothing is a sentence, not a throw", async () => {
  const root = page("<h1>Hello</h1>");
  const entry = makePageOutlineTool({ root });

  expect(await run(entry, { selector: "#missing" })).toBe(
    'nothing on the page matches "#missing"',
  );
  expect(await run(entry, { selector: "(((" })).toBe(
    '"(((" is not a valid CSS selector',
  );
  expect(await run(entry, { selector: 42 })).toBe("selector must be a string");
});

test("more headings than maxItems, and the answer says how many were left", async () => {
  const root = page(
    Array.from({ length: 5 }, (_, n) => `<h2>Heading ${n}</h2>`).join(""),
  );
  const said = await run(makePageOutlineTool({ root, maxItems: 2 }));

  expect(said).toContain("…[cut: 2 of 5 headings]");
});

test("a cut answer announces the cut", () => {
  const said = formatOutline(
    {
      title: "A very long title indeed, running well past the budget below",
      url: null,
      readyState: null,
      headings: [],
      total: 0,
    },
    20,
  );

  expect(said.startsWith("title: A very long t")).toBe(true);
  expect(said).toContain("…[cut: 20 of ");
});

test("a kit rooted on one element still reports the page it belongs to", async () => {
  page("<section id='part'><h2>Inside</h2></section>");
  document.title = "Checkout";
  const root = document.querySelector("#part");
  if (root === null) throw new Error("the fixture is missing #part");
  const said = await run(makePageOutlineTool({ root }));

  expect(said).toContain("title: Checkout");
  expect(said).toContain("h2 Inside");
});
