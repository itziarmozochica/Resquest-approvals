export interface OdooOrderTabEntitlement {
  name: string;
  quantity: number;
}

export interface OdooOrderTab {
  entitlements: OdooOrderTabEntitlement[];
  externalId: string;
  id: string;
  name: string | null;
}
