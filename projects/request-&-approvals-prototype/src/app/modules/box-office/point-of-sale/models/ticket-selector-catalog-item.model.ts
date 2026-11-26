export interface TicketSelectorCatalogPrice {
  readonly amount: number;
  readonly currency: string;
}

export interface TicketSelectorCatalogItem {
  readonly availableTickets: number | undefined;
  readonly isAddon: boolean;
  readonly isBundleUnavailable?: boolean;
  readonly isHidden: boolean;
  readonly isOngoing: boolean;
  readonly isPurchasable: boolean;
  readonly isShopProduct: boolean;
  readonly key: string;
  readonly maximum: number | undefined;
  readonly minimum: number;
  readonly name: string;
  readonly partySizeMinimum: number;
  readonly price: TicketSelectorCatalogPrice | null;
  readonly priceWithDiscount: TicketSelectorCatalogPrice | null;
  readonly sessionId: number;
  readonly stepQuantity: number;
  readonly ticketTypeId: string;
}

export interface DerivedTicketSelectorRow extends TicketSelectorCatalogItem {
  readonly endsAt: string;
  readonly hasSeating: boolean;
  readonly isCustomTile: boolean;
  readonly isMultiDay: boolean;
  readonly isPack: boolean;
  readonly isPass: boolean;
  readonly sessionTypeColor: string | null;
  readonly sessionTypeId: number | null;
  readonly startsAt: string;
}
