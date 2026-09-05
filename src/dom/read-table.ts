/**
 * A table as rows, because `innerText` runs one together.
 *
 * `pageText` on a table gives cells separated by whatever the layout happened
 * to put between them, and the column a value belonged to is gone. That is not
 * a formatting complaint: it is the difference between a model reading a price
 * and a model guessing one.
 */
import { readEntry, type ToolEntry } from "../kit.js";
import {
  cutToFit,
  NO_PAGE,
  noMatch,
  notASelector,
  notAString,
  shorten,
  tidyWhitespace,
} from "../shared/prose.js";
import { resolveRoot } from "../shared/root.js";
import { argumentsSchema } from "../shared/schema.js";
import { charBudget, itemBudget, type DomKitConfig } from "./config.js";

const MAX_CELL_CHARS = 40;
const SEPARATOR = " | ";

const ARGUMENTS = argumentsSchema({
  type: "object",
  properties: {
    selector: { type: "string", description: "A CSS selector for the table." },
    maxRows: { type: "integer", description: "How many rows to read." },
  },
  required: ["selector"],
  additionalProperties: false,
});

export interface TableRows {
  readonly rows: readonly (readonly string[])[];
  /** Before `maxRows` cut it, so the answer can say what it left out. */
  readonly total: number;
}

export const formatRows = (table: TableRows, maxChars: number): string => {
  if (table.total === 0) return "the table has no rows";
  const lines = table.rows.map((cells) => cells.join(SEPARATOR));
  if (table.total > table.rows.length)
    lines.push(`…[cut: ${table.rows.length} of ${table.total} rows]`);
  return cutToFit(lines.join("\n"), maxChars);
};

/**
 * The match itself, a table inside it, or the table it sits in — a model that
 * has a selector for a caption or a cell should not have to find the table.
 */
const findTable = (
  root: Document | Element,
  selector: string,
): Element | string => {
  let matched: Element | null;
  try {
    matched = root.querySelector(selector);
  } catch {
    return notASelector(selector);
  }
  if (matched === null) return noMatch(selector);
  if (matched.tagName === "TABLE") return matched;
  return (
    matched.querySelector("table") ??
    matched.closest("table") ??
    `"${selector}" is not a table and has none inside it`
  );
};

const readRows = (table: Element, maxRows: number): TableRows => {
  const found = [...table.querySelectorAll("tr")];
  return {
    total: found.length,
    rows: found
      .slice(0, maxRows)
      .map((row) =>
        [...row.querySelectorAll("th,td")].map((cell) =>
          shorten(tidyWhitespace(cell.textContent), MAX_CELL_CHARS),
        ),
      ),
  };
};

const resolveMaxRows = (maxRows: unknown, ceiling: number): number | string => {
  if (maxRows === undefined) return ceiling;
  if (typeof maxRows !== "number" || !Number.isFinite(maxRows))
    return "maxRows must be a number";
  if (maxRows < 1) return "maxRows must be at least 1";
  return Math.min(Math.floor(maxRows), ceiling);
};

export const makeReadTableTool = (config: DomKitConfig = {}): ToolEntry =>
  readEntry({
    name: "readTable",
    description:
      "Read a table as rows of cells, header row first. Page text runs a table together; this does not.",
    inputSchema: ARGUMENTS,
    execute: (input) => {
      const root = resolveRoot(config);
      if (root === null) return NO_PAGE;

      const selector = input.selector;
      if (typeof selector !== "string") return notAString("selector");
      if (selector.trim() === "") return "selector must not be empty";

      const table = findTable(root, selector);
      if (typeof table === "string") return table;

      const maxRows = resolveMaxRows(input.maxRows, itemBudget(config));
      if (typeof maxRows === "string") return maxRows;

      return formatRows(readRows(table, maxRows), charBudget(config));
    },
  });
