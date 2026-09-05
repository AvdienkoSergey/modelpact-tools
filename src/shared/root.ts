/**
 * Where a DOM tool gets the node it reads, and the seam that lets it be tested
 * without a browser.
 */

export interface RootConfig {
  /** Where the tool reads from; the document by default. */
  readonly root?: Document | Element;
}

/**
 * `globalThis["document"]` rather than the bare `document`, which in node is a
 * `ReferenceError` — a throw, and a throw fails the whole turn where the tool
 * owes the model a sentence. The reference tool does `config.root ?? document`
 * and has that hazard; answering `null` here is what lets the contract suite
 * fuzz every tool under `environment: "node"`.
 */
export const resolveRoot = (config: RootConfig): Document | Element | null => {
  if (config.root !== undefined) return config.root;
  const scope = globalThis as unknown as Record<string, unknown>;
  const page = scope.document;
  return typeof page === "object" && page !== null ? (page as Document) : null;
};

/** A `Document` has a body; an `Element` scoped into one does not. */
export const asDocument = (node: Document | Element): Document | null =>
  "body" in node ? node : null;

/**
 * The page a node belongs to, however narrowly the root was scoped. Title and
 * address are facts about the page, not about the element a kit happens to be
 * pointed at, so a kit rooted on one `<main>` still reports them.
 *
 * `ownerDocument` read through `unknown`: a fake root standing in for a page
 * in node has no such property, and the lib types say it always does.
 */
export const ownerDocument = (node: Document | Element): Document | null => {
  const page = asDocument(node);
  if (page !== null) return page;
  const owner: unknown = node.ownerDocument;
  return typeof owner === "object" && owner !== null
    ? (owner as Document)
    : null;
};
