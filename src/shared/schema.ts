/**
 * The argument shape, built once at module scope.
 *
 * `jsonSchema` answers `null` rather than throwing, so every tool would
 * otherwise repeat the same branch. Throwing here is right because it runs at
 * import: a shape that is not a schema is a bug in this package, not something
 * a model can correct.
 */
import { jsonSchema, type JsonSchema } from "modelpact";

export const argumentsSchema = (shape: Record<string, unknown>): JsonSchema => {
  const schema = jsonSchema(shape);
  if (schema === null) throw new Error("the argument shape is not a schema");
  return schema;
};
