/**
 * A tool is a function, so the bench calls one with no model anywhere.
 *
 * These are the assertions that pin the answers a model actually reads: the
 * exact shape of an outline, of a listing, of a table, and of every mistake in
 * the arguments.
 */
import { expect, test, type Page } from "@playwright/test";

const bench = async (
  page: Page,
  tool: string,
  args: string,
): Promise<string> => {
  await page.getByTestId("bench-tool").selectOption(tool);
  await page.getByTestId("bench-args").fill(args);
  await page.getByTestId("bench-run").click();
  const out = page.getByTestId("bench-out");
  await expect(out).not.toHaveText("Pick a tool and press Run.");
  return (await out.textContent()) ?? "";
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("pageOutline carries the page's own facts and a selector per heading", async ({
  page,
}) => {
  const said = await bench(page, "pageOutline", "{}");

  expect(said).toContain("title: modelpact-tools");
  expect(said).toContain("readyState: complete");
  expect(said).toContain("h1 Checkout  [#top]");
  expect(said).toContain("  h2 Your basket  [#basket-heading]");
  expect(said).toContain('    h3 Card details  [[data-testid="card-fields"]]');
});

test("findElements gives every match something to select it by, or nothing", async ({
  page,
}) => {
  const said = await bench(page, "findElements", '{ "selector": "button" }');

  expect(said).toContain('3 matches for "button":');
  expect(said).toContain('1. button "Continue to payment" [#pay] type=submit');
  expect(said).toContain('2. button "Cancel order" [button[name="cancel"]]');
  expect(said).toContain("disabled");
  // React's `useId` emits `:r7:`, which is not a selector and would not survive
  // the next mount either, so the third match is listed without one.
  expect(said).toContain('3. button "Save for later"');
  expect(said).not.toContain(":r7:");
});

test("readTable keeps the columns page text would run together", async ({
  page,
}) => {
  const said = await bench(page, "readTable", '{ "selector": "#basket" }');

  expect(said).toContain("Item | Qty | Price");
  expect(said).toContain("Wide-gamut display | 1 | £389.00");
  expect(said).toContain("Total |  | £659.50");
});

test("a selector for a cell finds the table it sits in", async ({ page }) => {
  const said = await bench(page, "readTable", '{ "selector": "tfoot td" }');

  expect(said).toContain("Item | Qty | Price");
});

test("the kit reads the page and not the panel around it", async ({ page }) => {
  const said = await bench(page, "pageText", "{}");

  expect(said).toContain("Checkout");
  expect(said).not.toContain("Call one by hand");
  expect(said).not.toContain("The kit, and what it costs");
});

test("every mistake in the arguments comes back as a sentence", async ({
  page,
}) => {
  expect(await bench(page, "findElements", '{ "selector": "(((" }')).toBe(
    '"(((" is not a valid CSS selector',
  );
  expect(await bench(page, "findElements", '{ "selector": "#nowhere" }')).toBe(
    'nothing on the page matches "#nowhere"',
  );
  expect(await bench(page, "findElements", '{ "selector": 7 }')).toBe(
    "selector must be a string",
  );
  expect(
    await bench(page, "findElements", '{ "selector": "button", "limit": 0 }'),
  ).toBe("limit must be at least 1");
  expect(await bench(page, "readTable", '{ "selector": "#top" }')).toBe(
    '"#top" is not a table and has none inside it',
  );
});

test("page text runs the table together, which is what readTable is for", async ({
  page,
}) => {
  const asText = await bench(page, "pageText", '{ "selector": "#basket" }');
  const asRows = await bench(page, "readTable", '{ "selector": "#basket" }');

  // Chrome's `innerText` separates cells by whatever the layout put between
  // them, and which column a value belonged to is gone.
  expect(asText).toContain("Wide-gamut display 1 £389.00");
  expect(asText).not.toContain("|");
  expect(asRows).toContain("Wide-gamut display | 1 | £389.00");
});

test("a cut is announced in the answer, not left for the model to notice", async ({
  page,
}) => {
  const said = await bench(
    page,
    "readTable",
    '{ "selector": "#basket", "maxRows": 1 }',
  );

  expect(said).toContain("Item | Qty | Price");
  expect(said).toContain("…[cut: 1 of 5 rows]");
});
