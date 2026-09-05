/**
 * A selector the model can hand back on its next call.
 *
 * Every listing tool owes its matches a handle, and a CSS selector is the only
 * one that costs nothing to carry and needs nothing installed. The catch is
 * that most selectors are not stable: a full `nth-child` path survives a
 * re-render as valid and resolves to a *different* element, which is worse
 * than failing. So this answers `null` rather than build one — the long paths
 * are exactly the unstable ones, and a caller that omits the selector loses
 * little and saves window.
 */

/** Test hooks first: they are put there to be selected on. */
const TEST_ATTRIBUTES = [
  "data-testid",
  "data-test-id",
  "data-test",
  "data-cy",
] as const;

/** A bare `#id` is only safe unescaped for a plain identifier. */
const PLAIN_ID = /^[A-Za-z][\w-]*$/;

/**
 * React 18's `useId` emits `:r1:` and Emotion and MUI emit `mui-1234`: both
 * change on the next mount, and the first is not even a valid selector
 * unescaped.
 */
const GENERATED_ID = /[:\s]|\d{4,}/;

const quote = (value: string): string => value.replace(/["\\]/g, "\\$&");

const isUnique = (
  root: Document | Element,
  selector: string,
  element: Element,
): boolean => {
  try {
    const found = root.querySelectorAll(selector);
    return found.length === 1 && found[0] === element;
  } catch {
    return false;
  }
};

const authoredId = (element: Element): string | null => {
  const id = element.getAttribute("id");
  if (id === null || !PLAIN_ID.test(id) || GENERATED_ID.test(id)) return null;
  return id;
};

const nthOfType = (element: Element): number => {
  let position = 1;
  let sibling = element.previousElementSibling;
  while (sibling !== null) {
    if (sibling.tagName === element.tagName) position += 1;
    sibling = sibling.previousElementSibling;
  }
  return position;
};

export const stableSelector = (
  root: Document | Element,
  element: Element,
): string | null => {
  for (const attribute of TEST_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (value === null || value === "") continue;
    const candidate = `[${attribute}="${quote(value)}"]`;
    if (isUnique(root, candidate, element)) return candidate;
  }

  const id = authoredId(element);
  if (id !== null && isUnique(root, `#${id}`, element)) return `#${id}`;

  const tag = element.tagName.toLowerCase();
  const name = element.getAttribute("name");
  if (name !== null && name !== "") {
    const candidate = `${tag}[name="${quote(name)}"]`;
    if (isUnique(root, candidate, element)) return candidate;
  }

  // One level up and no further: a path that needs two is already a path that
  // will drift.
  const parent = element.parentElement;
  const parentId = parent === null ? null : authoredId(parent);
  if (parentId !== null) {
    const candidate = `#${parentId} > ${tag}:nth-of-type(${nthOfType(element)})`;
    if (isUnique(root, candidate, element)) return candidate;
  }

  return null;
};
