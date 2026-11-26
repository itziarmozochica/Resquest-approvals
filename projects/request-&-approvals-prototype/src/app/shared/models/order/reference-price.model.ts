import { Money } from '../money.model';

export const referencePriceProvenances = ['pricing_promotion', 'pricing_promotion_unattributed', 'price_list'] as const;

export type ReferencePriceProvenance = (typeof referencePriceProvenances)[number];

export interface ReferencePrice {
  price: Money;
  pricePerTicket: Money;
  provenance: ReferencePriceProvenance;
  total: Money;
  unitPrice: Money;
}
