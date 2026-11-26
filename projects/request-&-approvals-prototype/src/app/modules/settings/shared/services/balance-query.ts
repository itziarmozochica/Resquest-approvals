import { Currency } from '../models/currency-enum';

export interface BalanceQuery {
  partnerId: number;
  businessId: string;
  userId?: number | null;
  amount?: number;
  currency?: string;
}

/** `distributorOrganizationId` is the addressed resource; the actor travels in the header. */
export interface DistributorBalanceQuery {
  distributorOrganizationId: number;
}

/**
 * What the balance should become — the endpoint sets it rather than adding to it.
 *
 * `currency` is the enum rather than a string because the endpoint does not normalise case the way
 * the booking-agent deposit does, and every `Currency` member is already the uppercase ISO code the
 * endpoint expects.
 */
export interface SetDistributorBalanceQuery extends DistributorBalanceQuery {
  amount: number;
  currency: Currency;
}

export interface DistributorBalancesQuery {
  itemsPerPage: number;
  page: number;
}
