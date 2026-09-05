/**
 * Where the model is, and what is on the page, for the price of one call.
 *
 * The cheap orientation move: a heading tree costs a fraction of the text and
 * carries a selector per heading, so the next call reads one section instead
 * of the document. Title and address come with it because they live in the
 * head, where `pageText` cannot reach them, and asking for them separately
 * would cost another tool's worth of window.
 */
import { readEntry, type ToolEntry } from "../kit.js";
import { cutToFit, NO_PAGE, shorten, tidyWhitespace } from "../shared/prose.js";
import { ownerDocument, resolveRoot } from "../shared/root.js";
import { argumentsSchema } from "../shared/schema.js";
import { stableSelector } from "../shared/selector.js";
import { findTarget } from "../shared/target.js";
import { charBudget, itemBudget, type DomKitConfig } from "./config.js";

const MAX_HEADING_CHARS = 80;
const INDENT = "  ";

const ARGUMENTS = argumentsSchema({
  type: "object",
  properties: {
    selector: {
      type: "string",
      description: "A CSS selector to outline. Omit it for the whole page.",
    },
  },
  additionalProperties: false,
});

export interface Heading {
  readonly level: number;
  readonly text: string;
  readonly selector: string | null;
}

export interface Outline {
  readonly title: string | null;
  readonly url: string | null;
  readonly readyState: string | null;
  readonly headings: readonly Heading[];
  /** Before `maxItems` cut it, so the answer can say what it left out. */
  readonly total: number;
}

/**
 * Indented from the shallowest heading present, not from `h1`: a section
 * starting at `h2` would otherwise be pushed right for no reason.
 */
export const formatOutline = (outline: Outline, maxChars: number): string => {
  const lines: string[] = [];
  if (outline.title !== null && outline.title !== "")
    lines.push(`title: ${outline.title}`);
  if (outline.url !== null) lines.push(`url: ${outline.url}`);
  if (outline.readyState !== null)
    lines.push(`readyState: ${outline.readyState}`);

  if (outline.headings.length === 0) {
    lines.push("no headings");
  } else {
    if (lines.length > 0) lines.push("");
    const shallowest = Math.min(...outline.headings.map((h) => h.level));
    for (const heading of outline.headings) {
      const indent = INDENT.repeat(heading.level - shallowest);
      const where = heading.selector === null ? "" : `  [${heading.selector}]`;
      lines.push(`${indent}h${heading.level} ${heading.text}${where}`);
    }
    if (outline.total > outline.headings.length)
      lines.push(
        `…[cut: ${outline.headings.length} of ${outline.total} headings]`,
      );
  }

  return cutToFit(lines.join("\n"), maxChars);
};

const readOutline = (
  root: Document | Element,
  target: Document | Element,
  maxItems: number,
): Outline => {
  const page = ownerDocument(target);
  const found = [...target.querySelectorAll("h1,h2,h3,h4,h5,h6")];
  return {
    title: page === null ? null : page.title,
    url: page === null ? null : page.location.href,
    readyState: page === null ? null : page.readyState,
    total: found.length,
    headings: found.slice(0, maxItems).map((element) => ({
      level: Number(element.tagName.charAt(1)),
      text: shorten(tidyWhitespace(element.textContent), MAX_HEADING_CHARS),
      selector: stableSelector(root, element),
    })),
  };
};

export const makePageOutlineTool = (config: DomKitConfig = {}): ToolEntry =>
  readEntry({
    name: "pageOutline",
    description:
      "Read the page title, address and heading tree, with a selector for each heading.",
    inputSchema: ARGUMENTS,
    execute: (input) => {
      const root = resolveRoot(config);
      if (root === null) return NO_PAGE;
      const target = findTarget(root, input.selector);
      if (typeof target === "string") return target;
      return formatOutline(
        readOutline(root, target, itemBudget(config)),
        charBudget(config),
      );
    },
  });
