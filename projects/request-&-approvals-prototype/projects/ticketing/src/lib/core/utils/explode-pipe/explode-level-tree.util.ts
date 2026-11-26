import { commonExplodePrefixSegmentCount, EXPLODE_PIPE_SEPARATOR, matchesExplodePrefix, splitExplodeLevels } from './explode-pipe.util';

export interface ExplodeLevelRow {
  /** Not sellable: sold out, not purchasable, or past its purchasable window. Build it with `toExplodeLevelRow`. */
  readonly isSoldOut: boolean;
  readonly key: string;
  readonly name: string;
}

export interface ExplodeLevelRowSource {
  readonly availableTickets: number | null | undefined;
  readonly isPurchasable: boolean;
  readonly key: string;
  readonly name: string;
}

export interface ExplodeLevel {
  readonly children: readonly ExplodeLevel[];
  readonly displayName: string;
  readonly index: number;
  readonly isDisabled: boolean;
  readonly rows: readonly ExplodeLevelRow[];
}

interface ExplodeLevelDraft {
  children: ExplodeLevelDraft[];
  displayName: string;
  index: number;
  rows: ExplodeLevelRow[];
}

const ROOT_LEVEL_INDEX = -1;

export function buildExplodeLevelTree(rows: readonly ExplodeLevelRow[], separator: string = EXPLODE_PIPE_SEPARATOR): ExplodeLevel {
  const root: ExplodeLevelDraft = { children: [], displayName: '', index: ROOT_LEVEL_INDEX, rows: [] };

  for (const row of rows) {
    const segments = row.name.split(separator);
    const displayName = segments.shift() ?? '';
    const level = root.children.find(candidate => candidate.displayName === displayName);

    if (level === undefined) {
      root.children.push(generateLevel(displayName, segments, row, root.index + 1));
    } else {
      addRowToLevel(level, row, segments);
    }
  }

  return freezeLevel(root);
}

export function toExplodeLevelRow(row: ExplodeLevelRowSource): ExplodeLevelRow {
  return { isSoldOut: !row.isPurchasable || row.availableTickets === 0, key: row.key, name: row.name };
}

export function levelHoldsSelectableRows(level: ExplodeLevel): boolean {
  if (level.rows.length === 0) {
    return false;
  }

  return level.children.length === 0 || hasSellableRows(level.rows);
}

export function resolveDefaultExplodePath(
  tree: ExplodeLevel,
  preferredLeafNames: readonly string[] = [],
  separator: string = EXPLODE_PIPE_SEPARATOR,
): string[] {
  const preferred = preferredLeafNames.at(-1);
  const labels = preferred === undefined ? [] : preferred.split(separator);

  return selectActiveLevel(tree.children, labels, [], preferred);
}

export function resolveRememberedExplodePath(tree: ExplodeLevel, rememberedPath: readonly string[]): string[] {
  const walkedLevels: ExplodeLevel[] = [];
  let levels = tree.children;

  for (const displayName of rememberedPath) {
    const level = levels.find(candidate => candidate.displayName === displayName);

    if (level === undefined || level.isDisabled) {
      break;
    }

    walkedLevels.push(level);
    levels = level.children;
  }

  const deepest = walkedLevels.at(-1);

  return deepest === undefined
    ? []
    : descendToOnSaleRows(
        deepest,
        walkedLevels.map(level => level.displayName),
      );
}

export function rowsAtExplodePath(tree: ExplodeLevel, path: readonly string[]): readonly ExplodeLevelRow[] {
  const level = levelAtExplodePath(tree, path);

  return level === undefined ? [] : level.rows;
}

export function filterOngoingRowsForLevel<T extends { readonly name: string }>(
  ongoingRows: readonly T[],
  levelRows: readonly { readonly name: string }[],
  hasExplodePipe: boolean,
  separator: string = EXPLODE_PIPE_SEPARATOR,
): readonly T[] {
  if (ongoingRows.length === 0) {
    return [];
  }

  if (!hasExplodePipe || levelRows.length === 0) {
    return ongoingRows;
  }

  // The last segment names the ticket itself, never the level: a level with a single ticket (or several sessions of the
  // same ticket) must not count it, or no ongoing row of that level would match.
  const levelDepth = Math.min(...levelRows.map(levelRow => splitExplodeLevels(levelRow.name, separator).length)) - 1;
  const segmentCount = Math.min(
    commonExplodePrefixSegmentCount(
      levelRows.map(levelRow => levelRow.name),
      separator,
    ),
    levelDepth,
  );

  if (segmentCount <= 0) {
    return ongoingRows;
  }

  const [reference] = levelRows;

  return ongoingRows.filter(row => matchesExplodePrefix(row.name, reference.name, segmentCount, separator));
}

function addRowToLevel(level: ExplodeLevelDraft, row: ExplodeLevelRow, segments: string[]): void {
  const displayName = segments.shift();

  if (segments.length === 0) {
    level.rows.push(row);

    return;
  }

  const child = level.children.find(candidate => candidate.displayName === displayName);

  if (child !== undefined) {
    addRowToLevel(child, row, segments);

    return;
  }

  if (displayName !== undefined) {
    level.children.push(generateLevel(displayName, segments, row, level.index + 1));
  }
}

function generateLevel(displayName: string, segments: string[], row: ExplodeLevelRow, index: number): ExplodeLevelDraft {
  const level: ExplodeLevelDraft = { children: [], displayName, index, rows: [] };

  if (segments.length > 0) {
    addRowToLevel(level, row, segments);
  } else {
    level.rows.push(row);
  }

  return level;
}

function freezeLevel(level: ExplodeLevelDraft): ExplodeLevel {
  const children = level.children.map(freezeLevel);

  return {
    children,
    displayName: level.displayName,
    index: level.index,
    isDisabled: hasSellableRows(level.rows) ? false : children.every(child => child.isDisabled),
    rows: level.rows,
  };
}

function descendToOnSaleRows(level: ExplodeLevel, path: string[]): string[] {
  if (hasSellableRows(level.rows)) {
    return path;
  }

  const onSaleChild = level.children.find(child => !child.isDisabled);

  return onSaleChild === undefined ? path : descendToOnSaleRows(onSaleChild, [...path, onSaleChild.displayName]);
}

function selectActiveLevel(
  levels: readonly ExplodeLevel[],
  labels: readonly string[],
  path: readonly string[],
  preferredName: string | undefined,
): string[] {
  const [head, ...rest] = labels;
  const matching = labels.length > 0 ? levels.find(level => level.displayName === head) : levels.find(level => !level.isDisabled);

  if (matching === undefined) {
    return [...path];
  }

  const nextPath = [...path, matching.displayName];

  if (levelHoldsSelectableRows(matching) || matching.rows.some(row => row.name === preferredName)) {
    return nextPath;
  }

  return selectActiveLevel(matching.children, rest, nextPath, preferredName);
}

function hasSellableRows(rows: readonly ExplodeLevelRow[]): boolean {
  return rows.some(row => !row.isSoldOut);
}

function levelAtExplodePath(tree: ExplodeLevel, path: readonly string[]): ExplodeLevel | undefined {
  let level: ExplodeLevel | undefined = tree;

  for (const displayName of path) {
    level = level?.children.find(child => child.displayName === displayName);
  }

  return level;
}
