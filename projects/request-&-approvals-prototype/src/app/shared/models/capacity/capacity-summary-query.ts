export interface CapacitySummaryQueryBase {
  partnerId: number;
  planId: number;
  placeId: number;
  timezone: string;
  startsAtFrom?: Date;
  startsAtTo?: Date;
  timeSlotId?: number;
}

export interface CapacitySummaryRangeQuery extends CapacitySummaryQueryBase {
  startsAtFrom: Date;
  startsAtTo: Date;
  timeSlotId?: never;
}

export interface CapacitySummaryTimeSlotIdQuery extends CapacitySummaryQueryBase {
  timeSlotId: number;
  startsAtFrom?: never;
  startsAtTo?: never;
}

export type CapacitySummaryQuery = CapacitySummaryRangeQuery | CapacitySummaryTimeSlotIdQuery;

export function isCapacitySummaryRangeQuery(query: CapacitySummaryQuery): query is CapacitySummaryRangeQuery {
  const requiredProperties: (keyof CapacitySummaryRangeQuery)[] = ['startsAtFrom', 'startsAtTo'];
  return requiredProperties.every(property => property in query);
}
