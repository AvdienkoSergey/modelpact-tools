/**
 * @vitest-environment jsdom
 */
import { expect, test } from "vitest";

import type { ToolEntry } from "../kit.js";
import { formatRows, makeReadTableTool } from "./read-table.js";

const run = async (
  entry: ToolEntry,
  input: Record<string, unknown>,
): Promise<string> => entry.tool.execute(input, new AbortController().signal);

const ORDERS = `
  <table id="orders">
    <thead><tr><th>Name</th><th>Qty</th><th>Price</th></tr></thead>
    <tbody>
      <tr><td>Widget</td><td>2</td><td id="cell">£4.00</td></tr>
      <tr><td>Gadget</td><td>1</td><td>£9.99</td></tr>
    </tbody>
  </table>
`;

const page = (html: string): Document => {
  document.body.innerHTML = html;
  return document;
};

test("rows come back as cells, header first", async () => {
  const root = page(ORDERS);
  const said = await run(makeReadTableTool({ root }), { selector: "#orders" });

  expect(said).toBe(
    "Name | Qty | Price\nWidget | 2 | £4.00\nGadget | 1 | £9.99",
  );
});

test("a selector for a wrapper finds the table inside it", async () => {
  const root = page(`<section id="wrap">${ORDERS}</section>`);
  const said = await run(makeReadTableTool({ root }), { selector: "#wrap" });

  expect(said).toContain("Widget | 2 | £4.00");
});

test("a selector for a cell finds the table it sits in", async () => {
  const root = page(ORDERS);
  const said = await run(makeReadTableTool({ root }), { selector: "#cell" });

  expect(said).toContain("Name | Qty | Price");
});

test("maxRows cuts, and the answer says what it left", async () => {
  const root = page(ORDERS);
  const said = await run(makeReadTableTool({ root }), {
    selector: "#orders",
    maxRows: 2,
  });

  expect(said).toContain("…[cut: 2 of 3 rows]");
  expect(said).not.toContain("Gadget");
});

test("every mistake in the arguments is a sentence", async () => {
  const root = page(`<p id="prose">Not a table.</p>${ORDERS}`);
  const entry = makeReadTableTool({ root });

  expect(await run(entry, { selector: "#prose" })).toBe(
    '"#prose" is not a table and has none inside it',
  );
  expect(await run(entry, { selector: "#missing" })).toBe(
    'nothing on the page matches "#missing"',
  );
  expect(await run(entry, { selector: "(((" })).toBe(
    '"(((" is not a valid CSS selector',
  );
  expect(await run(entry, {})).toBe("selector must be a string");
  expect(await run(entry, { selector: "#orders", maxRows: -1 })).toBe(
    "maxRows must be at least 1",
  );
});

test("an empty table says so rather than answering with nothing", () => {
  expect(formatRows({ rows: [], total: 0 }, 100)).toBe("the table has no rows");
});

test("a long table is cut to the character budget", () => {
  const rows = Array.from({ length: 50 }, (_, n) => [`row ${n}`, "value"]);
  const said = formatRows({ rows, total: 50 }, 40);

  expect(said).toContain("…[cut: 40 of ");
});
