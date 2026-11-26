import { canSelectTickets, effectiveMax, MaxLimitTicketField, type TicketType } from '@fz/ticketing';

import { TicketSelectorCatalogItem } from '../models/ticket-selector-catalog-item.model';

export interface PosTicketRowIncreaseParams {
  readonly forceDisableIncreaseCounter: boolean;
  readonly quantity: number;
}

function toLimitsTicketType(row: TicketSelectorCatalogItem): TicketType {
  return {
    availableTickets: row.availableTickets,
    isPurchasable: row.isPurchasable,
    maximum: row.maximum,
    minimum: row.minimum,
    name: row.name,
    partySizeMinimum: row.partySizeMinimum,
    sessionId: row.sessionId,
    stepQuantity: row.stepQuantity,
    ticketTypeId: row.ticketTypeId,
  };
}

export function rowEffectiveMax(row: TicketSelectorCatalogItem): number {
  return effectiveMax(toLimitsTicketType(row), MaxLimitTicketField.Maximum);
}

export function canIncrease(row: TicketSelectorCatalogItem, params: PosTicketRowIncreaseParams): boolean {
  const ticketType = toLimitsTicketType(row);

  return (
    canSelectTickets(ticketType, MaxLimitTicketField.Maximum) &&
    params.quantity < effectiveMax(ticketType, MaxLimitTicketField.Maximum) &&
    !params.forceDisableIncreaseCounter
  );
}
