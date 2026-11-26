import { environment } from '../../../environments/environment';

export function isExternalRequestUrl(url: string): boolean {
  const apiBaseAsyncRegex = new RegExp(
    `(${environment.apiB2CBaseUrl.replace('/', '\\/')}/api/[0-9.]{3}/(partners|internal/pricing)/[0-9]+)`,
  );
  return !(
    url.startsWith(environment.accessControlApiBaseUrl) ||
    url.startsWith(environment.apiBaseUrl) ||
    url.startsWith(environment.apiGWBaseUrl) ||
    url.startsWith(environment.agentsBaseUrl) ||
    url.startsWith(environment.apiIamBaseUrl) ||
    url.startsWith(environment.apiSpotsBaseUrl) ||
    url.startsWith(environment.apiB2cSiteBaseUrl) ||
    url.startsWith(environment.notificationsInboxApiBaseUrl) ||
    url.startsWith(environment.adsApiBaseUrl) ||
    url.startsWith(environment.crmApiBaseUrl) ||
    apiBaseAsyncRegex.test(url)
  );
}
