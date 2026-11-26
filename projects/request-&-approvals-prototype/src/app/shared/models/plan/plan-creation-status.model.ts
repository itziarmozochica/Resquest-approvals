export interface PlanCreationStatusVenue {
  id: number;
  name: string;
  timezone: string;
  currency: string;
}

export interface PlanCreationStatusResponse {
  id: number;
  partner_id: number;
  name: string;
  type: string;
  description: string;
  short_description: string;
  venues: PlanCreationStatusVenue[];
  gallery: string[];
  absolute_url: string;
  launch_code?: string | null;
  has_declarative_inventory?: boolean;
}

export interface PlanCreationStatusData<TPlanTypeSettings = unknown> {
  id: number;
  partnerId: number;
  name: string;
  type: string;
  description: string;
  shortDescription: string;
  venues: PlanCreationStatusVenue[];
  gallery: string[];
  absolute_url: string;
  launchCode?: string | null;
  hasDeclarativeInventory: boolean;
  planTypeSettings?: TPlanTypeSettings;
}
