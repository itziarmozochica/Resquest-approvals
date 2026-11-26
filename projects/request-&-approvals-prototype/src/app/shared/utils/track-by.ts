export function trackById<T>(_: number, item: { id: T }): T {
  return item?.id;
}

export function trackByCodePoolId(_index: number, item: { pool: { id: number } }): number {
  return item?.pool?.id;
}
