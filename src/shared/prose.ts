/**
 * The words a tool answers with when it cannot do what was asked.
 *
 * A throw from `execute` fails the turn and names the tool
 * (`toolThrewFailure`, modelpact's `helpers/tools.js`); a sentence comes back
 * as an ordinary result the model can read and act on. Every mistake reachable
 * from the arguments is therefore a sentence, and only a bug is a throw.
 */

export const NO_PAGE = "this tool needs a page and there is none";

export const notAString = (field: string): string =>
  `${field} must be a string`;

export const notASelector = (selector: string): string =>
  `"${selector}" is not a valid CSS selector`;

export const noMatch = (selector: string): string =>
  `nothing on the page matches "${selector}"`;

export const tidyWhitespace = (text: string): string =>
  text
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/**
 * Announced in-band, in the reference tool's wording: an answer that was cut
 * and does not say so reads as a complete one, and the model stops looking.
 */
export const cutToFit = (text: string, maxChars: number): string =>
  text.length <= maxChars
    ? text
    : `${text.slice(0, maxChars)}\n…[cut: ${maxChars} of ${text.length} characters]`;

/** For one field inside a line, where a whole announcement would not fit. */
export const shorten = (text: string, maxChars: number): string =>
  text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`;
