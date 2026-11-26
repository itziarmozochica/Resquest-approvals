import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ReportsExternalChannelsClickData {
  time: string;
}

export const reportsExternalChannelsClick = defineEvent<ReportsExternalChannelsClickData>('reports.externalChannels.click');
