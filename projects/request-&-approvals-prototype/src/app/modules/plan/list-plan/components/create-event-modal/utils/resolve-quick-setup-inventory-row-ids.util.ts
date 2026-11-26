export interface QuickSetupInventoryIdentifiedRow {
  name: string;
  id?: number | null;
}

export function resolveQuickSetupInventoryRowIds(
  rows: QuickSetupInventoryIdentifiedRow[],
  idsByName: Record<string, number>,
): (number | null)[] {
  const ids = new Map(Object.entries(idsByName));
  const takenIds = new Set<number>();
  const resolvedIds = rows.map(row => {
    const id = ids.get(row.name) ?? ids.get(row.name.trim());

    if (id === undefined || takenIds.has(id)) {
      return null;
    }

    takenIds.add(id);

    return id;
  });

  return resolvedIds.map((resolvedId, index) => {
    if (resolvedId !== null) {
      return resolvedId;
    }

    const ownId = rows[index].id ?? null;

    if (ownId === null || takenIds.has(ownId)) {
      return null;
    }

    takenIds.add(ownId);

    return ownId;
  });
}
