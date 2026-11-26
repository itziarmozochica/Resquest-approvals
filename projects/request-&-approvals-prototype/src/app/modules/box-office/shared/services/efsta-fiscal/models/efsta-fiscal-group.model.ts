import { ComplianceSubprocess } from './compliance-log.model';

/**
 * Called by the Hungarian and Polish mappers with a method code; returns the code's row in the fiscal group map,
 * `undefined` when the map has none, and the mapper then applies its country's default rule.
 */
export type EfstaFiscalGroupResolver = (paymentType: string | undefined) => string | undefined;

export type FiscalGroupsByMethodCode = ReadonlyMap<string, string>;

/** The fiscal operation a resolver or a map check serves. */
export type EfstaFiscalGroupOperation = Extract<ComplianceSubprocess, 'persist-transaction' | 'refund' | 'registration' | 'reprint'>;

/** Thrown when the stored onsite setup of a Hungarian or Polish fiscal operation carries no fiscal group map. */
export class FiscalGroupMapMissingError extends Error {
  override name = 'FiscalGroupMapMissingError';
}
