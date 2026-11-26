/**
 * Explode-pipe name parsing — ported from feverzone (`TicketType.EXPLODE_PIPE_SEPARATOR` /
 * `getDisplayName`, and `ticket-selector.component.ts`'s `#commonExplodePrefixSegmentCount` /
 * `#ongoingMatchesExplodePrefix`). Extracted here as framework-agnostic pure string functions:
 * the original methods were tangled with `TicketType` instances, so they operate on names + a
 * separator instead. Behaviour is preserved verbatim.
 *
 * A hierarchical ticket name encodes its levels joined by the separator, e.g.
 * `"Zone A | Adult"` → levels `["Zone A", "Adult"]`.
 */

/** Ticket names encode explode-pipe levels joined by this separator (`TicketType.EXPLODE_PIPE_SEPARATOR`). */
export const EXPLODE_PIPE_SEPARATOR = ' | ';

/** Split a ticket name into its trimmed explode-pipe level segments. */
export function splitExplodeLevels(name: string, separator: string = EXPLODE_PIPE_SEPARATOR): string[] {
  return name.split(separator).map(segment => segment.trim());
}

/**
 * The last explode-pipe segment of a name — the leaf level shown to the user
 * (feverzone `TicketType.getDisplayName(true)`). Uses the raw split (not trimmed), matching source.
 */
export function getLastExplodeSegment(name: string, separator: string = EXPLODE_PIPE_SEPARATOR): string | undefined {
  return name.split(separator).pop();
}

/**
 * Whether any of the given ticket names contains an explode-pipe level marker.
 *
 * Mirrors feverzone's `hasExplodePipe` re-derivation (`ticket-selector.component`
 * `#syncHasExplodePipeFromPrimary` / `checkCorrectExplodePipe`): it tests for the bare `|`
 * character, NOT the full `' | '` separator — a name like `"A|B"` counts even without the spaces.
 * Callers pass the primary (non-ongoing) names; filtering ticket types is not this util's concern.
 */
export function namesHaveExplodePipe(names: string[]): boolean {
  return names.some(name => name.includes('|'));
}

/** Number of leading explode segments shared by every name at the current level. */
export function commonExplodePrefixSegmentCount(names: string[], separator: string = EXPLODE_PIPE_SEPARATOR): number {
  if (names.length === 0) {
    return 0;
  }
  const parts = names.map(name => splitExplodeLevels(name, separator));
  const [firstPart] = parts;
  const minLen = Math.min(...parts.map(part => part.length));
  const divergingIndex = firstPart.slice(0, minLen).findIndex((segment, index) => !parts.every(part => part[index] === segment));
  return divergingIndex === -1 ? minLen : divergingIndex;
}

/** Whether `name` shares the first `segmentCount` explode segments with `referenceName`. */
export function matchesExplodePrefix(
  name: string,
  referenceName: string,
  segmentCount: number,
  separator: string = EXPLODE_PIPE_SEPARATOR,
): boolean {
  const parts = splitExplodeLevels(name, separator);
  const refParts = splitExplodeLevels(referenceName, separator);
  if (parts.length < segmentCount || refParts.length < segmentCount) {
    return false;
  }
  return refParts.slice(0, segmentCount).every((segment, index) => parts[index] === segment);
}
