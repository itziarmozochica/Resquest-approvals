import type { ReservationsOrder, ReservationsQuery } from '../models/reservations-query.model';

export function toReservationsQueryParams(query: ReservationsQuery): Readonly<Record<string, string>> {
  const params: Record<string, string> = {};

  put(params, 'search_term', query.searchTerm);
  put(params, 'reservation_locator', query.reservationLocator);
  put(params, 'starts_at_from', query.startsAtFrom);
  put(params, 'starts_at_to', query.startsAtTo);
  put(params, 'order_id', query.orderId);
  put(params, 'plan_id', query.planId);
  put(params, 'city_id', query.cityId);
  put(params, 'place_id', query.placeId);
  put(params, 'partner_id', query.partnerId);
  put(params, 'page', query.page);
  put(params, 'items_per_page', query.itemsPerPage);

  if (query.status !== undefined && query.status.length > 0) {
    params.reservation_status = query.status.join(',');
  }

  if (query.channelType !== undefined && query.channelType.length > 0) {
    params.channel_type = query.channelType.join(',');
  }

  if (query.orderBy !== undefined && query.orderBy.length > 0) {
    params.order_by = query.orderBy.map(toOrderCriterion).join(',');
  }

  return params;
}

function put(params: Record<string, string>, key: string, value: number | string | undefined): void {
  if (value === undefined) {
    return;
  }

  const asString = String(value);
  if (asString !== '') {
    params[key] = asString;
  }
}

function toOrderCriterion(order: ReservationsOrder): string {
  return `${order.field}.${order.direction}`;
}
