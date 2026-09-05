/**
 * @vitest-environment jsdom
 */
import { expect, test } from "vitest";

import { estimateRequestTokens } from "../budget.js";
import { INSPECT } from "../presets.js";
import { selectTools } from "../select.js";
import { describeKitContract } from "../testing/contract.js";
import { makeReadKit } from "./index.js";

document.body.innerHTML = `
  <h1 id="top">Orders</h1>
  <button id="pay">Pay</button>
  <table id="orders"><tr><th>Name</th></tr><tr><td>Widget</td></tr></table>
`;

describeKitContract("the read kit", () => makeReadKit({ root: document }));

test("the preset names exactly what the kit holds", () => {
  const kit = makeReadKit({ root: document });
  const tools = selectTools([kit], { only: INSPECT });

  expect(tools.map((tool) => tool.name)).toEqual([...INSPECT]);
  expect(tools).toHaveLength(kit.tools.length);
});

test("the whole kit leaves most of Gemini Nano's window to think with", () => {
  const cost = estimateRequestTokens(makeReadKit().tools);

  expect(cost).toBeGreaterThan(0);
  expect(cost).toBeLessThan(9_216 / 15);
});
