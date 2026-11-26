export const UNLIMITED_AVAILABLE_TICKETS = 100001;

export function getDisplayableUnitsAvailable(available: number | null | undefined): number | null {
  if (available === null || available === undefined || available >= UNLIMITED_AVAILABLE_TICKETS) {
    return null;
  }

  return available;
}
