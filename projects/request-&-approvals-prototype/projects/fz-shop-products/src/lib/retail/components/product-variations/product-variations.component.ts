import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  EnvironmentInjector,
  inject,
  input,
  signal,
  untracked,
  type Signal,
} from '@angular/core';

import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { IgntButtonComponent, IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import {
  IGNT_TABLE_TRANSLATIONS,
  IgntTableColumnComponent,
  IgntTableColumnTemplateDirective,
  IgntTableComponent,
  type IgntTableFilterConfig,
  type IgntTablePageChangeEvent,
  type IgntTableSearchConfig,
  type IgntTableTranslations,
} from '@ignite/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import type { DistributionsDialogData } from '../../models/dialog/product-variation/distributions-dialog.model';
import type {
  ProductVariationsFilterPanelData,
  ProductVariationsFilterResult,
} from '../../models/dialog/product-variation/product-variation-filter-dialog.model';
import type { WarehouseDetailsSidePanelData } from '../../models/dialog/product-variation/warehouse-details-side-panel.model';
import type { ProductVariationsActiveFilterPatch } from '../../models/product-variations/product-variations-active-filter.model';
import type { ProductVariation, ProductVariationsQuery } from '../../models/product-variations/product-variations.model';
import type { RetailSetup } from '../../models/retail-setup/retail-setup.model';
import { RetailSetupStore } from '../../store/retail-setup.store';
import { buildProductVariationsAppliedFilters } from '../../utils/product-variations/build-product-variations-applied-filters.util';
import { isProductVariationNew } from '../../utils/product-variations/is-product-variation-new.util';
import { PRODUCT_VARIATIONS_SHOW_EXTERNAL_ID_COLUMN_ID } from '../../utils/product-variations/product-variations-active-filter-id.util';
import {
  clearProductVariationsActiveFilters,
  getProductVariationsActiveFilterRemovalPatch,
} from '../../utils/product-variations/product-variations-active-filter-removal.util';
import { DistributionsComponent } from './distributions/distributions.component';
import { ProductVariationsTableFilterContentComponent } from './table-filter-content/product-variations-table-filter-content.component';
import { WarehouseDetailsComponent } from './warehouse-details/warehouse-details.component';

const PRODUCT_VARIATIONS_TRANSLATIONS = 'retailSetup.productVariations';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntIconComponent,
    IgntTableColumnComponent,
    IgntTableColumnTemplateDirective,
    IgntTableComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    NgOptimizedImage,
    EmptyStateComponent,
    TranslateModule,
  ],
  providers: [
    {
      deps: [TranslateService],
      multi: true,
      provide: IGNT_TABLE_TRANSLATIONS,
      useFactory: (translate: TranslateService): Signal<IgntTableTranslations> =>
        signal<IgntTableTranslations>({
          clearAllLabel: String(translate.instant('common.filter.clearAll')),
          emptyMessage: String(translate.instant(`${PRODUCT_VARIATIONS_TRANSLATIONS}.tableEmptyMessage`)),
          filterLabel: String(translate.instant('common.filter.label')),
          searchLabel: String(translate.instant(`${PRODUCT_VARIATIONS_TRANSLATIONS}.tableSearchLabel`)),
          filterActiveButtonLabel: (count: number) => String(translate.instant('common.filter.activeButtonLabel', { count })),
        }),
    },
  ],
  selector: 'fz-retail-product-variations',
  styleUrl: './product-variations.component.scss',
  templateUrl: './product-variations.component.html',
})
export class ProductVariationsComponent {
  readonly #dialogService = inject(IgntDialogService);
  readonly #environmentInjector = inject(EnvironmentInjector);
  readonly #store = inject(RetailSetupStore);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  readonly retail = input.required<RetailSetup>();

  readonly #loadedRetailSetupId = signal<string | null>(null);

  protected readonly showExternalId = computed(() => this.#store.showExternalId());
  protected readonly productVariations = computed<ProductVariation[]>(() => this.#store.productVariations());
  protected readonly columnTemplateType = computed<ProductVariation | undefined>(() => this.productVariations()[0]);
  protected readonly isLoadingProducts = computed(() => this.#store.isLoadingProducts());
  protected readonly query = computed<ProductVariationsQuery | null>(() => this.#store.query());
  protected readonly totalCount = computed(() => this.#store.totalCount());
  protected readonly syncProductsIcon: IconProp = ['far', 'arrows-repeat'];
  protected readonly showEmptyProductsState = computed(
    () => this.retail().lastSyncedAt === null && (this.retail().productVariationsCount ?? 0) === 0 && !this.isLoadingProducts(),
  );

  protected readonly pageSize = computed(() => this.query()?.itemsPerPage ?? 10);

  protected readonly pageIndex = computed(() => Math.max(0, (this.query()?.page ?? 1) - 1));

  protected readonly searchConfig = computed<IgntTableSearchConfig>(() => ({
    searchQuery: this.query()?.search ?? '',
  }));

  protected readonly appliedFilters = computed(() =>
    buildProductVariationsAppliedFilters({
      columnVisibility: [
        {
          id: PRODUCT_VARIATIONS_SHOW_EXTERNAL_ID_COLUMN_ID,
          isSelected: this.showExternalId(),
          label: this.#getShowExternalIdFilterLabel(),
        },
      ],
      warehouse: {
        options: this.retail().warehouses,
        selectedIds: this.query()?.warehouseIds ?? [],
      },
    }),
  );

  protected readonly filterConfig = computed<IgntTableFilterConfig>(() => {
    const appliedFilters = this.appliedFilters();

    return {
      appliedFilters,
      isActive: appliedFilters.length > 0,
      sidePanelContent: ProductVariationsTableFilterContentComponent,
      sidePanelOptions: {
        data: {
          selection: {
            showExternalId: this.showExternalId(),
            warehouse: this.query()?.warehouseIds ?? [],
          },
          warehouses: this.retail().warehouses,
        } satisfies ProductVariationsFilterPanelData,
      },
    };
  });

  constructor() {
    effect(() => {
      const setup = this.retail();
      const currentQuery = this.query();
      if (!currentQuery) {
        return;
      }
      untracked(() => {
        const previousRetailSetupId = this.#loadedRetailSetupId();
        this.#loadedRetailSetupId.set(setup.id);
        if (previousRetailSetupId !== null && previousRetailSetupId !== setup.id) {
          // The query reset re-triggers this effect, which then fetches with the fresh query.
          this.#store.resetProductVariationsQuery();
          return;
        }
        this.#fetchProductVariations(currentQuery, setup.id);
      });
    });
  }

  /** Syncs the catalog products; the empty state calls it, and so does the page title's sync action. */
  syncProducts(): void {
    if (this.retail().plans.length > 0) {
      this.#store.syncRetailProductsByPlans(this.retail().id);
      return;
    }

    this.#store.syncRetailProducts(this.retail().id);
    this.#toastService.add({
      delay: 5000,
      message: this.#translateService.instant('retailSetup.syncRetailProducts.syncInProgress') as string,
      sentiment: AlertSentiment.info,
    });
  }

  protected isNewProduct(createdAt: string): boolean {
    return isProductVariationNew(createdAt);
  }

  protected onFilterClearAll(): void {
    this.#applyActiveFilterPatch(clearProductVariationsActiveFilters());
  }

  protected onFilterClosed(result: unknown): void {
    if (result === undefined || result === null) {
      return;
    }

    const { selection } = result as ProductVariationsFilterResult;
    const ids = selection.warehouse;

    this.#store.patchQuery({
      page: 1,
      warehouseIds: ids.length > 0 ? ids : undefined,
    });
    this.#store.patchShowExternalId(selection.showExternalId);
  }

  protected onFilterPillRemoved({ id }: { id: string }): void {
    this.#applyActiveFilterPatch(
      getProductVariationsActiveFilterRemovalPatch({
        filterId: id,
        query: this.query(),
      }),
    );
  }

  protected onServerPagination(event: IgntTablePageChangeEvent): void {
    this.#store.patchQuery({ page: event.pageIndex + 1 });
  }

  protected openDistributions(productVariation: ProductVariation): void {
    this.#dialogService.openModal<DistributionsComponent, DistributionsDialogData>(DistributionsComponent, {
      data: {
        productVariationId: productVariation.id,
        productVariationName: productVariation.name,
      },
      injector: this.#environmentInjector,
      size: 'lg',
    });
  }

  protected openWarehouseDetails(productVariation: ProductVariation): void {
    this.#dialogService.openSidePanel<WarehouseDetailsComponent, WarehouseDetailsSidePanelData>(WarehouseDetailsComponent, {
      data: {
        productVariationName: productVariation.name,
        warehouses: productVariation.warehouses,
      },
    });
  }

  protected searchChanged(search: string): void {
    this.#store.patchQuery({ page: 1, search: search.trim() || undefined });
  }

  #applyActiveFilterPatch(patch: ProductVariationsActiveFilterPatch | null): void {
    if (patch?.query !== undefined) {
      this.#store.patchQuery(patch.query);
    }

    if (patch?.showExternalId !== undefined) {
      this.#store.patchShowExternalId(patch.showExternalId);
    }
  }

  #fetchProductVariations(query: ProductVariationsQuery, retailSetupId?: string): void {
    this.#store.fetchProductVariations({
      query,
      retailSetupId: retailSetupId ?? this.retail().id,
    });
  }

  #getShowExternalIdFilterLabel(): string {
    return String(this.#translateService.instant(`${PRODUCT_VARIATIONS_TRANSLATIONS}.columnVisibility.showExternalId`));
  }
}
