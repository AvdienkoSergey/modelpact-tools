/**
 * The categories, as lists of names for [`selectTools`](./select.ts).
 *
 * A preset is a task; a kit is a risk. They cross deliberately — `formFields`
 * reads and `fillField` writes, and both are what anyone means by "forms" — so
 * neither can be expressed as the other.
 *
 * `DIAGNOSE`, `FORMS` and `CONTENT` arrive with their tools. A preset naming a
 * tool that does not exist yet would only throw, and a name list that has to
 * be kept in step with a roadmap is a second source of truth.
 */

/** The page as it stands: what is on it, where, and in what shape. */
export const INSPECT = [
  "pageText",
  "pageOutline",
  "findElements",
  "readTable",
] as const;
