// Local-staging: same shape as environment.ts (relative URLs so the dev-server
// proxy — proxy.conf.json, targeting staging — intercepts every API call and
// avoids CORS), with SSO forced on since this build always targets staging.

import { isJest } from '@fz-original/app/app/test/is-jest';
import { isWindow } from '@fz-original/app/app/utils/window/window.util';

import { Environment } from './environment.model';

const isBrowser = isWindow(globalThis) && !isJest();
const origin = isBrowser ? window.location.origin : 'http://localhost:5200';
const localIp = isBrowser ? window.location.hostname : 'localhost';

export const environment: Environment = {
  accessControlApiBaseUrl: `${origin}/api-access-control`,
  adsApiBaseUrl: `${origin}/api-ads`,
  agentsBaseUrl: `${origin}/agents`,
  apiB2CBaseUrl: origin,
  apiB2cSiteBaseUrl: `${origin}/api/b2c_site`,
  apiBaseUrl: `${origin}/api/b2b`,
  apiGWBaseUrl: `${origin}/apigw`,
  apiIamBaseUrl: `${origin}/api-iam`,
  apiSpotsBaseUrl: `${origin}/api-spots`,
  baseUrl: origin,
  cashReceipt: {
    franchise_corp_num: '0000000000',
    user_id: 'example',
  },
  checkVersion: false,
  crmApiBaseUrl: `${origin}/api-crm`,
  datadog: {
    applicationId: '00000000-0000-0000-0000-000000000000',
    clientToken: 'pub00000000000000000000000000000000',
    commitHash: 'COMMIT_HASH',
    environment: 'local',
    log: {
      enabled: false,
    },
    rum: {
      enabled: false,
      sessionReplaySampleRate: 0,
      sessionSampleRate: 100,
      telemetrySampleRate: 0,
      traceSampleRate: 100,
      trackLongTasks: true,
      trackResources: true,
      trackUserInteractions: true,
      useSecureSessionCookie: false,
    },
    service: 'feverzoneclient',
    site: 'datadoghq.com',
  },
  efstaEfrBaseUrl: '/efr',
  feverzoneApplicationId: '00000000-0000-0000-0000-000000000000',
  formspree: {
    bulkEditSessionsPerTimeslotForm: 'form-id',
    newDescriptionForm: 'form-id',
    newNameform: 'form-id',
    newPictureForm: 'form-id',
    supportForm: 'form-id',
    supportGroupsForm: 'form-id',
  },
  googleMapsApiKey: 'GOOGLE_API_KEY_PLACEHOLDER',
  googlePickerAppId: '000000000000',
  googlePickerClientId: 'GOOGLE_CLIENT_ID_PLACEHOLDER',
  googlePlacesApiKey: 'GOOGLE_API_KEY_PLACEHOLDER',
  gtaId: 'UA-0000000-0',
  httpMaxRetries: 0,
  insightsDashboardsApiBaseUrl: `${origin}/api-insights`,
  insightsDashboardsPortalBaseUrl: 'http://localhost:4200',
  notificationsInboxApiBaseUrl: `${origin}/api-notifications`,
  OBO: {
    GENERIC_USER_ID: 1,
  },
  oneboxPanelBaseUrl: 'https://panel.oneboxtds.net/',
  optimizely: {
    key: 'OPTIMIZELY_SDK_KEY_PLACEHOLDER',
  },
  partners: {
    TUI: 873,
  },
  production: false,
  s3: {
    invitations: 'https://example.invalid/b2b/invitation',
    marketing: 'https://example.invalid/b2b/marketing/',
    standby: 'https://example.invalid/images/second-screen/stand-by/default/400x500',
  },
  salesforceBaseUrl: 'https://login.salesforce.com',
  sentry: {
    commitHash: 'COMMIT_HASH',
    dsn: '',
    enabled: false,
    environment: 'local',
    errorSampleRate: 0,
  },
  serviceWorker: {
    enable: false,
  },
  ssoLoginEnabled: true,
  stripeFallbackCurrency: 'EUR',
  stripeKeys: {
    AED: 'pk_test_51K421pEoAxpdDcjRoSCXyUCOPDNqR9gHeEkOl04loKvVG0HCTfcgI9W0pVIkZbGxiUSQ243ijXZdZ7If3Ju606gu00iJWy3uHa',
    AUD: 'pk_test_51IhuirG57e5iliT16iHrJT8K7H3Rl6Yo77i8XuzeDOJRcnMafadO0ayoy9lVjQVR8EShEkegp0LQVG6ata1hAwmU00thzxUobo',
    BRL: 'pk_test_I4WJLdxKDCVKy6vUJxZkLkFh00lfer8ShY',
    CAD: 'pk_test_51JKJkAHjydeSExCO6vaShLJuGlZArhriaHoA4n42iAvHlGpFw3Oi0stb0qVZWqOmaHb0LF2xwJJzN3rmJBsuEAQs00lc22eD2Q',
    CLP: 'pk_test_d1eaVLk0lOv1s4zR3ham8ZRt00D5rfowlu',
    DKK: 'pk_test_51Q548bPonkJMZwKMCFskfLxISujDhhLNczWXni2EZgBNZQ83Gwj2ghqF8XWpCrUQqW9NvLZcO6XtctTZtck7NY3f00PhJowLBn',
    EUR: 'pk_test_ZRQrNhhuI5m45XLLLwFYlMmF00AgiSMdqh',
    GBP: 'pk_test_DPFZBLdGcqpwYkzPmftBVkVD00jVvkploL',
    INR: 'pk_test_51Ot7QLSG1OFidxlPx5syaoGfdZjLEf4WPHIQdP4aoBtgrEPZG9XsDhlPMp73aQVUQ8VBdpj1IIvmON7t1QEQ6UNp00Y0uGDQOX',
    JPY: 'pk_test_51MVzIoJ1SsQ7ur8Sb0zDKc8XdOn8x4NnUeV43LDbZSN2NOMQmRyT2xIrEqN03uNvAbBHA3xgWDErh3ojMCNxpaIp00c79Z2Vtj',
    MXN: 'pk_test_51IhuRnAoZEjBhT7c354mWFDsTlxmUX5jzacfXjLrkqL5mh0uqd4uGBd469lSjJbDLZBY6VjHSTof3KWWbhM6NrY9000z98jvp8',
    SEK: 'pk_test_51Q54QlPuOGB8JevBZOPG3SdSOsPOufv2mVuEFchOiIDeL82SFduMXN5LsGXHxUV3D1JSOpKOYzG6v30h62nr2Crq005vLzqqbi',
    SGD: 'pk_test_51OpCmSQ4RYzIlz8KEMh4UgKXuhqmcXqZtxwByyJfg9IjIGmC3Y6JwbZ35vICGOS55C0Mwsff2m0wVHiieIhYrmBp00qS6YRivw',
    USD: 'pk_test_d1eaVLk0lOv1s4zR3ham8ZRt00D5rfowlu',
  },
  supersetBaseUrl: 'http://localhost:8088',
  survicate: {
    enable: false,
  },
  webclientBaseUrl: `http://${localIp}:3002`,
  workAdminBaseUrl: 'http://localhost:8002',
  zendesk: {
    fieldIds: {
      currentUrl: '38953741875858',
      partnerName: '38953754102930',
      userEmail: '38953769086610',
    },
    widgetKey: '00000000-0000-0000-0000-000000000000',
  },
};
