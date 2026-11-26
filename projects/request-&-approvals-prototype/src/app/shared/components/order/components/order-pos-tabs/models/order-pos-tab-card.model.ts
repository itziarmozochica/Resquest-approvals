import type { OdooOrderTab } from '@fz-original/app/modules/box-office/odoo-food-and-beverage/models/odoo-order-tab.model';

export interface OrderPosTabCard extends OdooOrderTab {
  isCollapsed: boolean;
  isOpening: boolean;
}
