import { expect, test } from "vitest";
import type { Tool } from "modelpact";

import { defineKit, readEntry, writeEntry, type Kit } from "./kit.js";
import { argumentsSchema } from "./shared/schema.js";
import { selectTools } from "./select.js";

const EMPTY = argumentsSchema({
  type: "object",
  properties: {},
  additionalProperties: false,
});

const stub = (name: string): Tool => ({
  name,
  description: `The ${name} tool.`,
  inputSchema: EMPTY,
  execute: () => name,
});

const reads = (...names: string[]): Kit =>
  defineKit(
    "read",
    names.map((name) => readEntry(stub(name))),
  );

const writes = (...names: string[]): Kit =>
  defineKit(
    "write",
    names.map((name) => writeEntry(stub(name))),
  );

test("with no selection every tool goes in, in kit order", () => {
  const tools = selectTools([reads("a", "b"), writes("c")]);

  expect(tools.map((tool) => tool.name)).toEqual(["a", "b", "c"]);
});

test("only sets both the set and its order", () => {
  const tools = selectTools([reads("a", "b", "c")], { only: ["c", "a"] });

  expect(tools.map((tool) => tool.name)).toEqual(["c", "a"]);
});

test("a name that is not there throws, naming the kits it looked in", () => {
  expect(() => selectTools([reads("a")], { only: ["fillField"] })).toThrow(
    /no tool named "fillField" in read/,
  );
});

test("except tolerates a name that is not there", () => {
  const tools = selectTools([reads("a", "b")], { except: ["b", "fillField"] });

  expect(tools.map((tool) => tool.name)).toEqual(["a"]);
});

test("effect narrows to one side of the risk line", () => {
  const tools = selectTools([reads("a"), writes("b")], { effect: "read" });

  expect(tools.map((tool) => tool.name)).toEqual(["a"]);
});

test("maxTools is applied last, in selection order", () => {
  const tools = selectTools([reads("a", "b", "c")], {
    only: ["c", "b", "a"],
    maxTools: 2,
  });

  expect(tools.map((tool) => tool.name)).toEqual(["c", "b"]);
});

test("a name in two kits throws: a backend would reach only one", () => {
  expect(() => selectTools([reads("a"), writes("a")])).toThrow(
    /two kits name "a"/,
  );
});

test("a kit naming a tool twice throws at construction", () => {
  expect(() => reads("a", "a")).toThrow(/names "a" twice/);
});
