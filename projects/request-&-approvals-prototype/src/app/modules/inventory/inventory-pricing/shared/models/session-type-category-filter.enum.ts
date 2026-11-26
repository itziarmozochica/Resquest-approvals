export enum SessionTypeCategoryFilter {
  SHOP_PRODUCT = 'shopProduct',
  TICKETS_AND_ADD_ONS = 'ticketsAndAddOns',
}

export const SessionTypeCategoryApiParam = {
  ADDON: 'addon',
  REGULAR_TICKET: 'regular_ticket',
  SHOP_PRODUCT: 'shop_product',
} as const;

export type SessionTypeCategoryApiParamValue = (typeof SessionTypeCategoryApiParam)[keyof typeof SessionTypeCategoryApiParam];

export const SessionTypeCategoryApiParams = {
  SHOP_PRODUCT: [SessionTypeCategoryApiParam.SHOP_PRODUCT],
  TICKETS_AND_ADD_ONS: [SessionTypeCategoryApiParam.REGULAR_TICKET, SessionTypeCategoryApiParam.ADDON],
} as const;
