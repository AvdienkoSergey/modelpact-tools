/**
 * The cost is the whole reason `selectTools` exists, so it is on screen and
 * moves as the selection does.
 */
import { expect, test } from "@playwright/test";

const tokensIn = (text: string): number =>
  Number(/^(\d+) tokens/.exec(text.trim())?.[1] ?? "0");

test("unticking a tool takes its cost out of the window", async ({ page }) => {
  await page.goto("/");
  const budget = page.getByTestId("budget");

  const whole = tokensIn((await budget.textContent()) ?? "");
  expect(whole).toBeGreaterThan(0);
  expect(whole).toBeLessThan(9_216 / 15);

  await page.locator("#tool-picker input[data-tool='readTable']").uncheck();
  const fewer = tokensIn((await budget.textContent()) ?? "");

  expect(fewer).toBeLessThan(whole);
});

test("with nothing selected there is no preamble to charge for", async ({
  page,
}) => {
  await page.goto("/");
  for (const box of await page.locator("#tool-picker input").all())
    await box.uncheck();

  await expect(page.getByTestId("budget")).toHaveText(/no preamble, no cost/);
});
