import type { CustomTabForDateQuery } from '../../models/custom-tabs/custom-tabs-query.model';

export interface CustomTabForDateParams extends Record<string, string> {
  channel: string;
  from_date: string;
}

export function mapToCustomTabForDateParams(query: CustomTabForDateQuery): CustomTabForDateParams {
  return { channel: query.channel, from_date: query.fromDate };
}
