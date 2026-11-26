import { SearchBarFilter } from '../enums/search-bar-filter.enum';

/**
 * City, plan and venue the search bar can preselect from the onsite setup stored on this device.
 */
export interface OnsiteSetupDefaults {
  cityId?: number;
  planId?: number;
  venueId?: number;
}

/**
 * Query params that already select a city, plan or venue. When any of them is present the onsite
 * setup is not used, so a deep link or a sidebar carry-over is never mixed with onsite defaults.
 */
export const SEARCH_BAR_SELECTION_QUERY_PARAMS: readonly string[] = ['cityId', 'cityName', 'planId', 'planName', 'venueId', 'venueName'];

/** Every field `preselectFromOnsiteSetup` fills unless a screen narrows it with `preselectOnsiteFilters`. */
export const ONSITE_SETUP_FILTERS: readonly SearchBarFilter[] = [SearchBarFilter.city, SearchBarFilter.plan, SearchBarFilter.place];
