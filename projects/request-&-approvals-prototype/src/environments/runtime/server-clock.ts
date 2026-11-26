let serverTimeOffsetMs: number | null = null;

export function recordServerClock(headers: Pick<Headers, 'get'> | undefined, now: number = Date.now()): void {
  const serverDateMs = Date.parse(headers?.get('date') ?? '');
  if (Number.isNaN(serverDateMs)) {
    return;
  }
  const ageSeconds = Number(headers?.get('age') ?? 0);
  const ageMs = Number.isFinite(ageSeconds) && ageSeconds > 0 ? ageSeconds * 1000 : 0;
  serverTimeOffsetMs = now - (serverDateMs + ageMs);
}

export function getServerTimeOffsetMs(): number | null {
  return serverTimeOffsetMs;
}

export function resetServerClock(): void {
  serverTimeOffsetMs = null;
}
