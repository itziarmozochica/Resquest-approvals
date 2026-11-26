export interface AddonRow {
  readonly name: string;
  readonly isAddon?: boolean;
}

export function isIndependentAddon(row: AddonRow): boolean {
  return row.isAddon === true && !row.name.includes('|');
}

export function separateIndependentAddons<T extends AddonRow>(rows: readonly T[]): readonly T[] {
  return rows.filter(row => isIndependentAddon(row));
}

export function filterTicketTypesForLevel<T extends AddonRow>(rows: readonly T[]): readonly T[] {
  return rows.filter(row => !isIndependentAddon(row));
}

export function filterOutGlobalAddonOnlyRows<T extends AddonRow>(rows: readonly T[]): readonly T[] {
  if (rows.length === 0) {
    return rows;
  }

  return rows.every(row => isIndependentAddon(row)) ? [] : rows;
}
