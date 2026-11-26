export type PosTimeSlotCalendarOpenTransition = 'closed' | 'opened';

export function getAvailabilityCalendarOpenTransition(wasOpen: boolean, isOpen: boolean): PosTimeSlotCalendarOpenTransition | null {
  if (wasOpen === isOpen) {
    return null;
  }

  return isOpen ? 'opened' : 'closed';
}
