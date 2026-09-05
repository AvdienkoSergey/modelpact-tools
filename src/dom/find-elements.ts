/**
 * The handle-finding tool: a selector in, and for each match something the
 * model can select on next turn.
 *
 * `pageText` tells the model a button says "Continue"; this tells it what to
 * write to reach that button. Matches without a stable selector are still
 * listed — knowing a thing exists and cannot be addressed is worth more than a
 * path that will drift ([shared/selector.ts](../shared/selector.ts)).
 */
import { readEntry, type ToolEntry } from "../kit.js";
import {
  cutToFit,
  NO_PAGE,
  noMatch,
  notAString,
  shorten,
  tidyWhitespace,
} from "../shared/prose.js";
import { resolveRoot } from "../shared/root.js";
import { argumentsSchema } from "../shared/schema.js";
import { stableSelector } from "../shared/selector.js";
import { findAll } from "../shared/target.js";
import { charBudget, itemBudget, type DomKitConfig } from "./config.js";

const MAX_TEXT_CHARS = 60;
const MAX_VALUE_CHARS = 40;

/** Enough to tell two matches apart without listing the whole attribute set. */
const REPORTED = ["name", "type", "role", "aria-label", "placeholder", "href"];

/**
 * Read as attributes, not properties: a property is the live state, and
 * reporting it here would make this look like a form reader it is not.
 */
const FLAGS = ["disabled", "required", "hidden"];

const ARGUMENTS = argumentsSchema({
  type: "object",
  properties: {
    selector: { type: "string", description: "A CSS selector to match." },
    limit: { type: "integer", description: "How many matches to list." },
  },
  required: ["selector"],
  additionalProperties: false,
});

export interface Match {
  readonly tag: string;
  readonly text: string;
  readonly selector: string | null;
  readonly details: readonly string[];
}

export const formatMatches = (
  selector: string,
  matches: readonly Match[],
  total: number,
  maxChars: number,
): string => {
  const plural = total === 1 ? "match" : "matches";
  const head =
    total > matches.length
      ? `${total} ${plural} for "${selector}", showing ${matches.length}:`
      : `${total} ${plural} for "${selector}":`;

  const lines = matches.map((match, position) => {
    const where = match.selector === null ? "" : ` [${match.selector}]`;
    const text = match.text === "" ? "" : ` "${match.text}"`;
    const details =
      match.details.length === 0 ? "" : ` ${match.details.join(" ")}`;
    return `${position + 1}. ${match.tag}${text}${where}${details}`;
  });

  return cutToFit([head, ...lines].join("\n"), maxChars);
};

const readMatch = (root: Document | Element, element: Element): Match => {
  const details: string[] = [];
  for (const attribute of REPORTED) {
    const value = element.getAttribute(attribute);
    if (value !== null && value !== "")
      details.push(`${attribute}=${shorten(value, MAX_VALUE_CHARS)}`);
  }
  for (const flag of FLAGS) if (element.hasAttribute(flag)) details.push(flag);

  return {
    tag: element.tagName.toLowerCase(),
    text: shorten(tidyWhitespace(element.textContent), MAX_TEXT_CHARS),
    selector: stableSelector(root, element),
    details,
  };
};

/**
 * A bad `limit` is answered rather than ignored: quietly returning forty
 * matches to a request for five reads as forty being all there is.
 */
const resolveLimit = (limit: unknown, ceiling: number): number | string => {
  if (limit === undefined) return ceiling;
  if (typeof limit !== "number" || !Number.isFinite(limit))
    return "limit must be a number";
  if (limit < 1) return "limit must be at least 1";
  return Math.min(Math.floor(limit), ceiling);
};

export const makeFindElementsTool = (config: DomKitConfig = {}): ToolEntry =>
  readEntry({
    name: "findElements",
    description:
      "List the elements matching a CSS selector: tag, text, attributes and a selector for each.",
    inputSchema: ARGUMENTS,
    execute: (input) => {
      const root = resolveRoot(config);
      if (root === null) return NO_PAGE;

      const selector = input.selector;
      if (typeof selector !== "string") return notAString("selector");
      const found = findAll(root, selector);
      if (typeof found === "string") return found;
      if (found.length === 0) return noMatch(selector);

      const limit = resolveLimit(input.limit, itemBudget(config));
      if (typeof limit === "string") return limit;

      return formatMatches(
        selector,
        found.slice(0, limit).map((element) => readMatch(root, element)),
        found.length,
        charBudget(config),
      );
    },
  });
