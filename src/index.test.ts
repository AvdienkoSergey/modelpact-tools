import { expect, test } from "vitest";

import * as entry from "./index.js";

/**
 * The claim the `exports` split rests on: this entry runs where there is no
 * page. A `document` reached from here would only fail in someone else's node
 * process.
 */
test("the entry point loads in node, where there is no page", () => {
  expect("document" in globalThis).toBe(false);
  expect(entry.resolveRoot({})).toBeNull();
});
