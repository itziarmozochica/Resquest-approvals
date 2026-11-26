import { SessionTypeCatalogItem } from '@fz-original/app/shared/services/sessions/session-type-catalog.model';

import { TicketTypeOption } from '../models/ticket-type-option.model';

/**
 * Regular ticket types and add-ons can be picked one by one; shop products are never offered. An
 * entire-event requirement does not cover add-ons, so an add-on needs its own selection here.
 */
export function isSelectableTicketType(ticketType: SessionTypeCatalogItem): boolean {
  return !ticketType.isShopProduct;
}

/**
 * The options a card offers: every selectable catalog entry, plus every selected id the selectable
 * list does not carry. A selected id still present in the catalog is a legacy row (attached to a
 * shop product, which this picker never offers) and keeps its real label; one missing from the
 * catalog altogether is unknown. Both stay visible so they can be removed, neither can be added anew.
 */
export function buildTicketTypeOptions(catalog: SessionTypeCatalogItem[], selectedIds: number[]): TicketTypeOption[] {
  const selectable = catalog.filter(isSelectableTicketType);
  const offeredIds = new Set(selectable.map(ticketType => ticketType.id));
  const byId = new Map(catalog.map(ticketType => [ticketType.id, ticketType]));
  const extras = selectedIds
    .filter(id => !offeredIds.has(id))
    .map((id): TicketTypeOption => {
      const known = byId.get(id);
      return known ? { id, kind: 'legacy', label: known.label } : { id, kind: 'unknown', label: null };
    });
  return [
    ...selectable.map((ticketType): TicketTypeOption => ({ id: ticketType.id, kind: 'selectable', label: ticketType.label })),
    ...extras,
  ];
}
