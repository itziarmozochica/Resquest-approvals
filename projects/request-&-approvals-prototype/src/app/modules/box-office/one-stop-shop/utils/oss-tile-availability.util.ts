import { UNLIMITED_AVAILABLE_TICKETS } from '../constants/oss-tile-availability.constants';

export function getDisplayableUnitsAvailable(available: number | null | undefined): number | null {
  if (available == null || available >= UNLIMITED_AVAILABLE_TICKETS) {
    return null;
  }

  return available;
}
