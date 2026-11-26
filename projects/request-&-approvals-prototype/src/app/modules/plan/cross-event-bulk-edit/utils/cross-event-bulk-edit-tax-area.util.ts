import { ProductTaxRate } from '@fz-original/app/shared/services/tax-area/product-tax-area.model';

export interface CrossEventBulkEditTaxAreaRequest {
  placeId: number;
  planId: number;
}

export function crossEventBulkEditTaxAreaRequests(
  selectedPlanIds: readonly number[],
  planPlaceIds: Record<number, number | null>,
): CrossEventBulkEditTaxAreaRequest[] {
  return selectedPlanIds.flatMap(planId => {
    const placeId = planPlaceIds[planId];
    if (placeId === undefined || placeId === null) {
      return [];
    }

    return [{ placeId, planId }];
  });
}

export function uniqueProductTaxRates(productTaxRateLists: readonly ProductTaxRate[][]): ProductTaxRate[] {
  const productTaxRates = productTaxRateLists.flat();
  return productTaxRates.filter(
    (productTaxRate, index) => productTaxRates.findIndex(existingRate => existingRate.productType === productTaxRate.productType) === index,
  );
}
