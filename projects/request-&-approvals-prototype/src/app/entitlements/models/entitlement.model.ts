export enum EntitlementType {
  PURCHASE_FOR_FREE = 'purchase_for_free',
  RESCHEDULE_FOR_FREE = 'reschedule_for_free',
  SHOPS = 'shops',
}

interface EntitlementBase {
  id: number;
  name: string;
  type: EntitlementType;
}

export interface EntitlementPurchase extends EntitlementBase {
  type: EntitlementType.PURCHASE_FOR_FREE;
  configuration: EntitlementConfigurationPurchase;
}

export interface EntitlementReschedule extends EntitlementBase {
  type: EntitlementType.RESCHEDULE_FOR_FREE;
  configuration: EntitlementConfigurationReschedule;
}

export interface EntitlementShops extends EntitlementBase {
  type: EntitlementType.SHOPS;
  configuration: EntitlementConfigurationShops;
  shopsConfig: ShopsConfig | null;
}

export interface ShopsConfig {
  retailSetup: {
    id: string;
    name: string;
  };
  retailSetupId: string | null;
  restriction: {
    model: string;
    id: string;
    name: string | null;
    timeRangeSeconds: number | null;
  };
  benefit: {
    kind: string;
    value: number;
  };
}

export type Entitlement = EntitlementPurchase | EntitlementReschedule | EntitlementShops;

export interface EntitlementConfigurationPurchase {
  cityId: number | null;
  mainPlanId: number | null;
  sessionTypeId: number | null;
}

export interface EntitlementConfigurationReschedule {
  cityId: number | null;
  mainPlanId: number | null;
  maxDaysAfterVisit: number;
  maxDaysBeforeInitialVisit: number;
  maxReschedules: number;
  sessionTypeId: number | null;
}

export interface EntitlementConfigurationShops {
  cityId: number | null;
  mainPlanId: number | null;
  sessionTypeId: number | null;
}
