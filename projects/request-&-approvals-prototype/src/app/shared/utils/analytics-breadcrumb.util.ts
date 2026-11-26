export const ANALYTICS_BASE_ROUTE = '/analytics';
export const ANALYTICS_HOME_LINK = ANALYTICS_BASE_ROUTE;

const ANALYTICS_REPORTING_SECTIONS: readonly string[] = ['catalog', 'dashboard'];

export function isAnalyticsReportingSection(url: string): boolean {
  const [path] = url.split(/[?#]/);
  const [, root, section] = path.split('/');

  return `/${root}` === ANALYTICS_BASE_ROUTE && ANALYTICS_REPORTING_SECTIONS.includes(section ?? '');
}
