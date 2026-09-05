/**
 * Turning the model's `selector` argument into nodes, or into a sentence
 * saying why not.
 *
 * A string return is the failure: the same discriminator the reference tool
 * uses, and it keeps the branch at the call site to one `typeof`.
 */
import { noMatch, notASelector, notAString } from "./prose.js";

/** An absent or empty selector means the whole root, as `pageText` has it. */
export const findTarget = (
  root: Document | Element,
  selector: unknown,
): Document | Element | string => {
  if (selector === undefined || selector === "") return root;
  if (typeof selector !== "string") return notAString("selector");
  try {
    return root.querySelector(selector) ?? noMatch(selector);
  } catch {
    return notASelector(selector);
  }
};

/** For tools whose selector is required, where empty is a mistake, not "all". */
export const findAll = (
  root: Document | Element,
  selector: unknown,
): Element[] | string => {
  if (typeof selector !== "string") return notAString("selector");
  if (selector.trim() === "") return "selector must not be empty";
  try {
    return [...root.querySelectorAll(selector)];
  } catch {
    return notASelector(selector);
  }
};
