// Builds the backend field `code` for a translatable field, mirroring exactly
// the codes the backend stores in `HtmlContentSchemaField.code` (generated in
// `HtmlContentComponent.get_translations`). Keeping this generation in ONE
// place — guarded by golden + contract-exhaustiveness specs — is what lets a
// REST edit target a translation by `(code, language)` without an id.
//
// Format (matches the backend):
//   root field:  `<blockId>.<field_snake>`                      e.g. `b1.text`
//   item field:  `<blockId>.<collection>.<itemId>.<field_snake>` e.g. `b1.cards.c1.accent_color`
// `collection` is the block contract's `items.propsKey` (`cards` / `tabs` /
// `items`), which equals the backend's collection segment.

/** A nesting level on the way to a field: a collection name + the item id within it. */
export interface FieldCodePathSegment {
  readonly collection: string;
  readonly itemId: string;
}

/**
 * Converts a camelCase field name to the snake_case the backend stores, e.g.
 * `accentColor` -> `accent_color`, `imageSrc` -> `image_src`. Identity for
 * already-lowercase names (`text`, `title`). The block contracts use no digits
 * or acronyms in field names, so this single rule round-trips losslessly.
 */
export function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);
}

/**
 * Builds the backend `code` for a field. `path` accumulates one segment per
 * nesting level, so it generalises to arbitrary depth: a future doubly-nested
 * component would simply pass two segments. Empty `path` => a root field.
 */
export function buildFieldCode(blockId: string, field: string, path: readonly FieldCodePathSegment[] = []): string {
  const prefix = path.reduce(
    (accumulator: string, segment: FieldCodePathSegment) => `${accumulator}.${segment.collection}.${segment.itemId}`,
    blockId,
  );
  return `${prefix}.${camelToSnake(field)}`;
}
