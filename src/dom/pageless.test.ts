/**
 * The kit in node, where there is no page at all.
 *
 * The environment the rest of the DOM tests opt out of, and where the contract
 * suite's fuzz becomes the pageless rule: a tool that reaches for a `document`
 * that is not there throws, and the fuzz forbids throwing. No separate
 * assertion is needed, only this file.
 */
import { expect, test } from "vitest";

import { describeKitContract } from "../testing/contract.js";
import { makeReadKit } from "./index.js";

describeKitContract("the read kit with no page", () => makeReadKit());

test("every tool says there is no page rather than guessing", () => {
  const signal = new AbortController().signal;
  const said = makeReadKit().tools.map((tool) =>
    tool.execute({ selector: "h1" }, signal),
  );

  expect(said).toEqual(
    said.map(() => "this tool needs a page and there is none"),
  );
});
