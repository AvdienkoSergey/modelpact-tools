/**
 * The round the package exists for: the model asks for a tool, the contract
 * runs it against this page, and the answer goes back as a turn.
 *
 * Nothing here needs a daemon or weights. The `stub` provider is
 * `makeOllamaProvider` over a `fetch` that answers from `src/stub-daemon.ts`,
 * so every wire shape is the real one and the model behind it is not.
 */
import { expect, test, type Page } from "@playwright/test";

const send = async (page: Page, asked: string): Promise<void> => {
  await page.getByTestId("ask").fill(asked);
  await page.getByTestId("send").click();
  await expect(page.getByTestId("send")).toBeEnabled();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("provider").selectOption("stub");
});

test("a turn runs the tool the model asked for and answers from what it read", async ({
  page,
}) => {
  await send(page, "what is on this page?");

  await expect(page.getByTestId("access")).toHaveText("ready");
  await expect(page.getByTestId("calls").locator("li")).toHaveCount(1);
  await expect(page.getByTestId("calls")).toContainText("pageOutline({})");
  await expect(page.getByTestId("answer")).toContainText(
    'The first line back was "title: modelpact-tools"',
  );
});

test("a different question reaches a different tool, with arguments", async ({
  page,
}) => {
  await send(page, "what is the total?");

  await expect(page.getByTestId("calls")).toContainText(
    'readTable({"selector":"#basket"})',
  );
  await expect(page.getByTestId("answer")).toContainText("Item | Qty | Price");
});

test("the answer streams in rather than landing whole", async ({ page }) => {
  await page.getByTestId("ask").fill("which buttons are there?");
  await page.getByTestId("send").click();

  // Caught mid-stream: the text is there before the button comes back.
  await expect(page.getByTestId("answer")).not.toBeEmpty();
  await expect(page.getByTestId("send")).toBeEnabled();
  await expect(page.getByTestId("calls")).toContainText(
    'findElements({"selector":"button"})',
  );
  await expect(page.getByTestId("answer")).toContainText("3 matches");
});

test("a tool unticked is a tool the model cannot call", async ({ page }) => {
  await page.locator("#tool-picker input[data-tool='pageOutline']").uncheck();
  await send(page, "what is on this page?");

  // The stub still asks for it by name; the request never carried it, so the
  // contract answers the model rather than failing the turn.
  await expect(page.getByTestId("calls").locator("li")).toHaveCount(0);
  await expect(page.getByTestId("answer")).toContainText(
    'there is no tool called "pageOutline"',
  );
});

test("a backend with no model behind it refuses before a session is opened", async ({
  page,
}) => {
  await page.getByTestId("provider").selectOption("prompt-api");
  await send(page, "what is on this page?");

  await expect(page.getByTestId("access")).toContainText("unavailable");
  await expect(page.getByTestId("calls").locator("li")).toHaveCount(0);
});
