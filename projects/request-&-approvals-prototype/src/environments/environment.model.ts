export interface Environment {
  accessControlApiBaseUrl: string;
  adsApiBaseUrl: string;
  agentsBaseUrl: string;
  apiB2CBaseUrl: string;
  apiB2cSiteBaseUrl: string;
  apiBaseUrl: string;
  apiGWBaseUrl: string;
  apiIamBaseUrl: string;
  apiSpotsBaseUrl: string;
  baseUrl: string;
  cashReceipt: CashReceipt;
  checkVersion: boolean;
  crmApiBaseUrl: string;
  datadog: Datadog;
  efstaEfrBaseUrl: string;
  feverzoneApplicationId: string;
  formspree: Formspree;
  googleMapsApiKey: string;
  googlePlacesApiKey: string;
  googlePickerApiKey?: string;
  googlePickerClientId?: string;
  googlePickerAppId?: string;
  gtaId: string;
  httpMaxRetries: number;
  insightsDashboardsApiBaseUrl: string;
  insightsDashboardsPortalBaseUrl: string;
  notificationsInboxApiBaseUrl: string;
  OBO: OBO;
  oneboxPanelBaseUrl: string;
  optimizely: Optimizely;
  partners: PartnerConfig;
  production: boolean;
  s3: S3;
  salesforceBaseUrl?: string;
  sentry: Sentry;
  serviceWorker: Survicate;
  ssoLoginEnabled: boolean;
  stripeFallbackCurrency: keyof StripeKeys;
  stripeKeys: StripeKeys;
  supersetBaseUrl: string;
  survicate: Survicate;
  webclientBaseUrl: string;
  workAdminBaseUrl: string;
  zendesk: Zendesk;
}

export interface Zendesk {
  fieldIds: ZendeskFieldIds;
  widgetKey: string;
}

export interface ZendeskFieldIds {
  currentUrl: string;
  partnerName: string;
  userEmail: string;
}

export interface PartnerConfig {
  [key: string]: number;
}

export interface OBO {
  GENERIC_USER_ID: number;
}

export interface StripeKeys {
  AED: string;
  AUD: string;
  BRL: string;
  CAD: string;
  CLP: string;
  DKK: string;
  EUR: string;
  GBP: string;
  INR: string;
  JPY: string;
  MXN: string;
  SEK: string;
  SGD: string;
  USD: string;
}

export interface Datadog {
  applicationId: string;
  clientToken: string;
  commitHash: string;
  environment: string;
  log: Log;
  rum: Rum;
  service: string;
  site: string;
}

export interface Rum {
  enabled: boolean;
  sessionReplaySampleRate: number;
  sessionSampleRate: number;
  telemetrySampleRate: number;
  traceSampleRate: number;
  trackLongTasks: boolean;
  trackResources: boolean;
  trackUserInteractions: boolean;
  useSecureSessionCookie: boolean;
}

export interface Log {
  enabled: boolean;
}

export interface Sentry {
  commitHash: string;
  dsn: string;
  enabled: boolean;
  environment: string;
  errorSampleRate: number;
}

export interface S3 {
  invitations: string;
  marketing: string;
  standby: string;
}

export interface Optimizely {
  key: string;
}

export interface Survicate {
  enable: boolean;
}

export interface Formspree {
  bulkEditSessionsPerTimeslotForm: string;
  newDescriptionForm: string;
  newNameform: string;
  newPictureForm: string;
  supportForm: string;
  supportGroupsForm: string;
  formId?: string;
}

export interface CashReceipt {
  franchise_corp_num: string;
  user_id: string;
}
