import { type UserAttributes } from '@optimizely/optimizely-sdk';

export const VENUE_ID_ATTRIBUTE = 'venue_id';

export function venueAttributes(venueId: number | string | null | undefined): UserAttributes {
  const value = String(venueId ?? '').trim();

  return value === '' ? {} : { [VENUE_ID_ATTRIBUTE]: value };
}
