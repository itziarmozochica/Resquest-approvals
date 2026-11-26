import { computed, inject } from '@angular/core';

import { patchState, signalStoreFeature, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap } from 'rxjs';

import type { Distributions } from '../models/product-variations/distributions.model';
import type {
  ProductVariation,
  ProductVariationsQuery,
  ProductVariationsResult,
} from '../models/product-variations/product-variations.model';
import { initialState, type ProductVariationsStoreState } from '../models/store/product-variations.feature.model';
import { FzRetailSetupService } from '../services/retail-setup.service';

type ProductsRequestState = Pick<ProductVariationsStoreState, 'isLoadingProducts' | 'productsError'>;

function setProductsPending(): ProductsRequestState {
  return { isLoadingProducts: true, productsError: null };
}

function setProductsError(error: unknown): ProductsRequestState {
  return { isLoadingProducts: false, productsError: error };
}

function setProductsSuccess(): ProductsRequestState {
  return { isLoadingProducts: false, productsError: null };
}

type DistributionsRequestState = Pick<ProductVariationsStoreState, 'distributionsError' | 'isLoadingDistributions'>;

function setDistributionsPending(): DistributionsRequestState {
  return { distributionsError: null, isLoadingDistributions: true };
}

function setDistributionsError(error: unknown): DistributionsRequestState {
  return { distributionsError: error, isLoadingDistributions: false };
}

function setDistributionsSuccess(): DistributionsRequestState {
  return { distributionsError: null, isLoadingDistributions: false };
}

const productVariationsCollection = 'productVariations' as const;

const productVariationsFeature = signalStoreFeature(
  withEntities({
    collection: productVariationsCollection,
    entity: null as unknown as ProductVariation,
  }),
  withState<ProductVariationsStoreState>(initialState),
  withComputed(({ productVariationsEntities }) => ({
    productVariations: computed(() => productVariationsEntities()),
  })),
  withMethods((store, fzRetailSetupService = inject(FzRetailSetupService)) => ({
    fetchDistributions: rxMethod<{ productVariationId: string; retailSetupId: string }>(
      pipe(
        switchMap(({ productVariationId, retailSetupId }) => {
          patchState(store, setDistributionsPending(), {
            distributions: [],
            selectedProductVariationId: productVariationId,
          });
          return fzRetailSetupService.getDistributions(retailSetupId, productVariationId).pipe(
            tap((result: Distributions) => {
              patchState(store, setDistributionsSuccess(), { distributions: result.plans });
            }),
            catchError((error: unknown) => {
              patchState(store, setDistributionsError(error));
              return EMPTY;
            }),
          );
        }),
      ),
    ),
    fetchProductVariations: rxMethod<{ query: ProductVariationsQuery; retailSetupId: string }>(
      pipe(
        switchMap(({ query, retailSetupId }) => {
          patchState(store, setProductsPending());
          return fzRetailSetupService.getProductVariations(retailSetupId, query).pipe(
            tap((result: ProductVariationsResult) => {
              patchState(
                store,
                setProductsSuccess(),
                setAllEntities(result.productVariations, { collection: productVariationsCollection }),
                {
                  nextPage: result.nextPage,
                  previousPage: result.previousPage,
                  query,
                  totalCount: result.totalCount,
                },
              );
            }),
            catchError((error: unknown) => {
              patchState(store, setProductsError(error));
              return EMPTY;
            }),
          );
        }),
      ),
    ),
    patchQuery(partial: Partial<ProductVariationsQuery>): void {
      const current = store.query() ?? initialState.query;
      patchState(store, { query: { ...current, ...partial } });
    },
    patchShowExternalId(showExternalId: boolean): void {
      patchState(store, { showExternalId });
    },
    resetProductVariationsQuery(): void {
      patchState(store, setAllEntities([] as ProductVariation[], { collection: productVariationsCollection }), {
        nextPage: null,
        previousPage: null,
        productsError: null,
        query: { ...initialState.query },
        showExternalId: false,
        totalCount: 0,
      });
    },
  })),
);

export type WithProductVariations = typeof productVariationsFeature;

export function withProductVariations(): WithProductVariations {
  return productVariationsFeature;
}
