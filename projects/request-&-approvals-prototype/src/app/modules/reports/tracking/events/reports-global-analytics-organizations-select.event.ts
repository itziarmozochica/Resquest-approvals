import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type ReportsGlobalAnalyticsOrganizationsSelectInteraction = 'click' | 'enter';

export interface ReportsGlobalAnalyticsOrganizationsSelectData {
  event: ReportsGlobalAnalyticsOrganizationsSelectInteraction;
  inputType: 'organization';
  screen: 'global-analytics';
  selectedOption?: string;
  typed: string;
}

export const reportsGlobalAnalyticsOrganizationsSelect = defineEvent<ReportsGlobalAnalyticsOrganizationsSelectData>(
  'reports.globalAnalytics.organizations.select',
);
