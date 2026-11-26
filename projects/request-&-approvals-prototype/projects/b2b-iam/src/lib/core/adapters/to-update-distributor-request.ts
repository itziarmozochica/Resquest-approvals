import type { UpdateDistributor, UpdateDistributorRequest } from '../models/distributor.model';

/**
 * Maps the domain update shape to the wire body — the write-side mirror of `adaptDistributor`.
 *
 * Only keys the caller actually set are emitted: the endpoint rejects unknown properties, and an
 * explicit `undefined` would still serialize as a key. That keeps a partial update partial.
 */
export function toUpdateDistributorRequest(distributor: UpdateDistributor): UpdateDistributorRequest {
  return {
    ...pick('address', distributor.address),
    ...pick('billing_name', distributor.billingName),
    ...pick('city_code', distributor.cityCode),
    ...pick('contact_name', distributor.contactName),
    ...pick('country_code', distributor.countryCode),
    ...pick('description', distributor.description),
    ...pick('email', distributor.email),
    ...pick('name', distributor.name),
    ...pick('phone', distributor.phone),
    ...pick('postal_code', distributor.postalCode),
    ...pick('region', distributor.region),
    ...pick('tax_identification_number', distributor.taxIdentificationNumber),
  };
}

function pick<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value };
}
