/** Random id for blocks and their nested items (cards, tabs, grid items). */
export function uid(): string {
  return crypto.randomUUID();
}
