export interface OSSOnsiteSetupConfig {
  cityId: number;
  id: string;
  placeCountryCode?: string;
  placeId: number;
  placeName: string;
}

export interface OSSPlanConfig {
  id: string;
  cityId: string;
  placeId: string;
}

export interface OSSConfig {
  onsiteSetup: OSSOnsiteSetupConfig;
  plan?: OSSPlanConfig;
  customTabDatetime?: string;
  partnerId?: number;
}
