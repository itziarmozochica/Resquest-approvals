import { levelHoldsSelectableRows, resolveDefaultExplodePath, type ExplodeLevel } from '@fz/ticketing';

import type { FztExplodeLevelItemVm, FztExplodeLevelRowVm } from '../models/ticket-selector-vm.model';

export function buildExplodeLevelRowsVm(tree: ExplodeLevel, path: readonly string[]): readonly FztExplodeLevelRowVm[] {
  const rows: FztExplodeLevelRowVm[] = [];
  let siblings: readonly ExplodeLevel[] = tree.children;
  let depth = 0;

  while (siblings.length > 0) {
    const prefix = path.slice(0, depth);
    const selectedName = path[depth];

    rows.push({
      items: siblings.map(level => toItemVm(level, prefix, selectedName)),
      key: prefix.join(' | '),
    });

    const selected = siblings.find(level => level.displayName === selectedName);

    if (selected === undefined) {
      return rows;
    }

    siblings = selected.children;
    depth += 1;
  }

  return rows;
}

function toItemVm(level: ExplodeLevel, prefix: readonly string[], selectedName: string | undefined): FztExplodeLevelItemVm {
  const levelPath = [...prefix, level.displayName];

  return {
    isDisabled: level.isDisabled,
    isSelected: level.displayName === selectedName,
    key: levelPath.join(' | '),
    name: level.displayName,
    path: levelHoldsSelectableRows(level) ? levelPath : [...levelPath, ...clickPathBelow(level)],
  };
}

// A greyed level has no enabled child to descend through, so its click follows the first child down to
// rows instead: the grid then shows the level's unavailable tiles rather than nothing.
function clickPathBelow(level: ExplodeLevel): string[] {
  const defaultPath = resolveDefaultExplodePath(level);

  return defaultPath.length > 0 ? defaultPath : firstChildPathToRows(level);
}

function firstChildPathToRows(level: ExplodeLevel): string[] {
  if (level.rows.length > 0 || level.children.length === 0) {
    return [];
  }

  const [firstChild] = level.children;

  return [firstChild.displayName, ...firstChildPathToRows(firstChild)];
}
