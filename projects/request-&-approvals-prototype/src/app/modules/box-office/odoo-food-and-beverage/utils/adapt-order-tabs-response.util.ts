import { assertIsDefined } from '@fz/utils/assert-is-defined';

import type { OdooOrderTab } from '../models/odoo-order-tab.model';
import type { OrderTabsResponse } from '../models/order-tabs.api';

export function adaptOrderTabsResponse(response: OrderTabsResponse): OdooOrderTab[] {
  const data = response.data;
  assertIsDefined(data);

  return data.tabs.map(tab => ({
    entitlements: tab.entitlements.map(entitlement => ({ name: entitlement.name, quantity: entitlement.quantity })),
    externalId: tab.external_id,
    id: tab.id,
    name: tab.name,
  }));
}
