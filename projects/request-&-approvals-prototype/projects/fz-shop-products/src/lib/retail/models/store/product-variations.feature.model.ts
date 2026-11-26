import type { DistributionPlan } from '../product-variations/distributions.model';
import type { ProductVariationsQuery } from '../product-variations/product-variations.model';

interface DistributionStoreState {
  distributions: DistributionPlan[];
  distributionsError: unknown;
  isLoadingDistributions: boolean;
  selectedProductVariationId: string | null;
}

export interface ProductVariationsStoreState extends DistributionStoreState {
  isLoadingProducts: boolean;
  nextPage: number | null;
  previousPage: number | null;
  productsError: unknown;
  query: ProductVariationsQuery | null;
  showExternalId: boolean;
  totalCount: number;
}

const initialDistributionState: DistributionStoreState = {
  distributions: [],
  distributionsError: null,
  isLoadingDistributions: false,
  selectedProductVariationId: null,
};

export const initialState: ProductVariationsStoreState = {
  ...initialDistributionState,
  isLoadingProducts: false,
  nextPage: null,
  previousPage: null,
  productsError: null,
  query: {
    includeImages: true,
    itemsPerPage: 10,
    page: 1,
  },
  showExternalId: false,
  totalCount: 0,
};
