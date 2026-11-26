import { RecentSearchTimeLabel } from './recent-search-time.util';

export interface RecentSearch {
  /** Epoch milliseconds; `null` for searches saved before the time was stored. */
  searchedAt: number | null;
  value: string;
}

/** A search as the dropdown paints it: the value split around the typed query, and its time label. */
export interface RecentSearchItem {
  after: string;
  before: string;
  match: string;
  time: RecentSearchTimeLabel | null;
  value: string;
}
