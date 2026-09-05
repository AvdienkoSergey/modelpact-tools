/**
 * The suite against a tool this package did not write.
 *
 * `makeMockTool` is modelpact's own fixture — its `execute`, its record of
 * calls, its delay — and running the contract over it is what says the suite
 * tests the contract rather than the habits of the four tools next to it. The
 * same reason `describeContract` is run against every backend and not only the
 * mock.
 *
 * Its defaults are configured past on two points, and both are the fixture's
 * business rather than a fault: the default schema describes no argument, and
 * the default reply hands back `text` unchanged, so `{ text: "" }` answers
 * with nothing. A page tool may do neither.
 */
import { makeMockTool } from "modelpact/tools";

import { readEntry } from "../kit.js";
import { argumentsSchema } from "../shared/schema.js";
import { describeToolContract } from "./contract.js";

describeToolContract("a tool built by someone else's factory", () =>
  readEntry(
    makeMockTool({
      name: "lookupColour",
      description: "Return the colour recorded for an item name.",
      inputSchema: argumentsSchema({
        type: "object",
        properties: {
          item: { type: "string", description: "The item to look up." },
        },
        required: ["item"],
        additionalProperties: false,
      }),
      reply: (input) =>
        typeof input.item === "string" ? `${input.item} is red` : "unknown",
    }),
  ),
);
