import { asString } from '../_shared/dto-codec.util';
import { EventDetailsProps } from './event-details.model';

/** Wire shape (snake_case) — see models/block.dto.ts for the conventions. */
export interface EventDetailsPropsDTO {
  heading: string;
  location_line: string;
  dates_line: string;
  promo: string;
}

export function eventDetailsPropsFromDto(raw: Record<string, unknown>): EventDetailsProps {
  return {
    heading: asString(raw['heading']),
    locationLine: asString(raw['location_line']),
    datesLine: asString(raw['dates_line']),
    promo: asString(raw['promo']),
  };
}

export function eventDetailsPropsToDto(p: EventDetailsProps): EventDetailsPropsDTO {
  return {
    heading: p.heading,
    location_line: p.locationLine,
    dates_line: p.datesLine,
    promo: p.promo,
  };
}
