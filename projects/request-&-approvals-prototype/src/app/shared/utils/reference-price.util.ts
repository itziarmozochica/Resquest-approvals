import { Money } from '../models/money.model';
import { ReferencePriceProvenance } from '../models/order/reference-price.model';

const struckReferencePriceProvenances: ReadonlySet<ReferencePriceProvenance> = new Set<ReferencePriceProvenance>([
  'pricing_promotion',
  'pricing_promotion_unattributed',
]);

export function shouldShowReferencePrice(
  referenceMoney: Money | null | undefined,
  displayedMoney: Money | null | undefined,
  provenance: ReferencePriceProvenance | null | undefined,
): boolean {
  if (provenance == null || !struckReferencePriceProvenances.has(provenance)) {
    return false;
  }
  if (referenceMoney == null || displayedMoney == null) {
    return false;
  }
  return referenceMoney.currency === displayedMoney.currency && referenceMoney.amount !== displayedMoney.amount;
}
