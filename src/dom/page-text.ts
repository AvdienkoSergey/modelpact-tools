/**
 * The page as a person sees it: visible text, cut to leave the window room for
 * a question and an answer.
 *
 * Eyes, not hands — nothing on the page changes. Lived in `modelpact/tools`
 * until 2.2.2, which moved reading a real page here and kept a mock tool
 * there; the shape below is that tool's, with the root resolved through
 * [resolveRoot](../shared/root.ts) so no page is a sentence rather than a
 * `ReferenceError`.
 */
import { readEntry, type ToolEntry } from "../kit.js";
import { cutToFit, NO_PAGE, tidyWhitespace } from "../shared/prose.js";
import { asDocument, resolveRoot } from "../shared/root.js";
import { argumentsSchema } from "../shared/schema.js";
import { findTarget } from "../shared/target.js";
import { charBudget, type DomKitConfig } from "./config.js";

const ARGUMENTS = argumentsSchema({
  type: "object",
  properties: {
    selector: {
      type: "string",
      description: "A CSS selector to read. Omit it for the whole page.",
    },
  },
  additionalProperties: false,
});

/**
 * `innerText` is what a person sees — no hidden nodes, no script — and only an
 * HTML element has it. Read through `unknown` rather than `instanceof
 * HTMLElement`: that name is not a global in node, where a fake root stands in
 * for the page, and jsdom has no `innerText` at all.
 */
export const readVisibleText = (node: Document | Element): string => {
  const page = asDocument(node);
  // `Document.body` is typed non-null but is null until the parser reaches it.
  const source: unknown = page === null ? node : page.body;
  if (source === null || source === undefined) return "";
  const fields = source as { innerText?: unknown; textContent?: unknown };
  if (typeof fields.innerText === "string") return fields.innerText;
  return typeof fields.textContent === "string" ? fields.textContent : "";
};

export const makePageTextTool = (config: DomKitConfig = {}): ToolEntry =>
  readEntry({
    name: "pageText",
    description:
      "Read the visible text of the page, or of the element matching a CSS selector. Long text is cut.",
    inputSchema: ARGUMENTS,
    execute: (input) => {
      const root = resolveRoot(config);
      if (root === null) return NO_PAGE;
      const target = findTarget(root, input.selector);
      if (typeof target === "string") return target;
      const text = tidyWhitespace(readVisibleText(target));
      if (text === "") return "the page has no visible text";
      return cutToFit(text, charBudget(config));
    },
  });
