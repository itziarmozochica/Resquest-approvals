export function createTapToPayRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tap-to-pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
