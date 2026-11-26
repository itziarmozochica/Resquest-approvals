import { Venue, VenueDTO } from '@fz-original/app/shared/models/plan/plan-detail.model';

/**
 * `PlanDetailAdapter.fromApi` assigns `PlanDetailDTO.venues` straight to `PlanDetail.venues` with no per-venue
 * mapping, so a venue read from the plan detail endpoint is a snake_case `VenueDTO` wearing the camelCase `Venue`
 * type — `id` and `name` are spelled the same, the rest is not, and the compiler cannot see it. The resume flow is
 * the first code to feed that object to the preview (which reads `address` / `zipCode` / `cityName`), so it is
 * normalised here at the boundary instead of in the shared adapter.
 */
export function normalizeResumedVenue(venue: Venue | VenueDTO): Venue {
  if (!isVenueDto(venue)) {
    return venue;
  }

  return {
    address: venue.address,
    cityName: venue.city_name,
    currency: venue.currency,
    googlePlaceId: venue.google_place_id,
    id: venue.id,
    isPublic: venue.is_public,
    latitude: venue.latitude,
    longitude: venue.longitude,
    name: venue.name,
    timezone: venue.timezone,
    type: venue.type,
    zipCode: venue.zip_code,
  };
}

function isVenueDto(venue: Venue | VenueDTO): venue is VenueDTO {
  return 'city_name' in venue || 'zip_code' in venue || 'google_place_id' in venue || 'is_public' in venue;
}
