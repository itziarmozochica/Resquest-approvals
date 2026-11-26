import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, type Data } from '@angular/router';

import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import {
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogModule,
  IgntDialogRef,
  IgntDialogService,
  type IgntButtonIcon,
} from '@ignite/common';
import { AlertSentiment, IgntAlertComponent } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

import { EditRetailFormComponent } from '../../components/edit-retail-form/edit-retail-form.component';
import { ProductVariationsComponent } from '../../components/product-variations/product-variations.component';
import { RetailDetailsComponent } from '../../components/retail-details/retail-details.component';
import { RetailPageTitleComponent } from '../../components/retail-page-title/retail-page-title.component';
import type { RetailEditDialogResult } from '../../models/dialog/retail-edit-dialog.model';
import type { RetailSetup, RetailSetupId } from '../../models/retail-setup/retail-setup.model';
import type { RetailViewNavigationState } from '../../models/retail-setup/retail-view-navigation-state.model';
import type { RetailViewFlow } from '../../models/retail-view-resolve.model';
import { RetailSetupStore } from '../../store/retail-setup.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntDialogCloseDirective,
    IgntDialogModule,
    ProductVariationsComponent,
    RetailDetailsComponent,
    RetailPageTitleComponent,
    RouterLink,
    TranslateModule,
  ],
  selector: 'fz-retail-view',
  styleUrl: './retail-view.component.scss',
  templateUrl: './retail-view.component.html',
})
export class RetailViewComponent implements AfterViewInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #store = inject(RetailSetupStore);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  #retailEditDialogRef: IgntDialogRef<RetailEditDialogResult> | null = null;
  #syncProductsDialogRef: IgntDialogRef | null = null;

  readonly syncByPlansToastTemplate = viewChild.required<TemplateRef<unknown>>('syncByPlansToastTemplate');
  // Snapshot of the plans the toast reports on. The template outlives this container's state — navigate to
  // another integration inside the toast's 5s and a live `retailSetup()` would relist that one's plans.
  protected readonly syncedPlans = signal<readonly number[]>([]);
  readonly syncProductsDialogTemplate = viewChild.required<TemplateRef<unknown>>('syncProductsDialogTemplate');
  protected readonly productVariations = viewChild(ProductVariationsComponent);

  readonly catalogId = input.required<string>();

  readonly #viewFlow = toSignal(this.#route.data.pipe(map((data: Data) => data.viewFlow as RetailViewFlow)), {
    initialValue: this.#route.snapshot.data.viewFlow as RetailViewFlow,
  });

  protected readonly retailSetup = computed(() => this.#store.retailSetup());
  protected readonly availableRetailSetups = computed(() => this.#store.availableRetailSetups());
  protected readonly fetchError = computed(() => this.#viewFlow() === 'retailError');
  protected readonly showRetailDetails = computed(() => this.retailSetup()?.id === this.catalogId());
  // The products' sync action sits on the right of the page title; before the first sync the empty products state offers it.
  protected readonly showSyncProductsButton = computed(
    () => !this.fetchError() && this.showRetailDetails() && (this.retailSetup()?.lastSyncedAt ?? null) !== null,
  );
  protected readonly syncProductsIcon: IgntButtonIcon = { name: 'arrows-repeat', variant: 'regular' };

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.#retailEditDialogRef?.close();
      this.#retailEditDialogRef = null;
      this.#syncProductsDialogRef?.close();
      this.#syncProductsDialogRef = null;
    });
    this.#setupUpdateToastEffect();
    this.#setupSyncProductsToastEffect();
  }

  ngAfterViewInit(): void {
    const state = history.state as RetailViewNavigationState;
    const { productSyncAfterCreation } = state;
    const retailSetup = this.retailSetup();

    if (productSyncAfterCreation && retailSetup) {
      history.replaceState({ ...state, productSyncAfterCreation: false }, '');
      this.#triggerProductSync(retailSetup);
    }
  }

  onEditIntegration(): void {
    const retailSetup = this.retailSetup();
    if (this.#retailEditDialogRef === null && retailSetup) {
      this.#openRetailEditDialog(retailSetup);
    }
  }

  onRetailSetupSelected(retailSetupId: RetailSetupId): void {
    if (retailSetupId === this.catalogId()) {
      return;
    }
    Promise.resolve(this.#router.navigate(['/', 'products', 'catalog-integrations', retailSetupId])).catch((): undefined => undefined);
  }

  onSyncProducts(): void {
    this.productVariations()?.syncProducts();
  }

  #openRetailEditDialog(setup: RetailSetup): void {
    const currencySelectOptions = this.#store.retailCurrencyOptions();
    this.#retailEditDialogRef = this.#dialogService.openSidePanel<RetailEditDialogResult>(EditRetailFormComponent, {
      data: {
        currencySelectOptions,
        isAvailableUnitsTrackingEnabled: setup.isAvailableUnitsTrackingEnabled,
        isSyncEnabled: setup.isSyncEnabled,
        overriddenExternalCurrency: setup.overriddenExternalCurrency ?? '',
        retailName: setup.name,
        retailSetupId: setup.id,
      },
    });
    this.#retailEditDialogRef.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: RetailEditDialogResult) => {
      this.#retailEditDialogRef = null;
      if (result?.type === 'save') {
        this.#store.updateRetail({
          changes: {
            isAvailableUnitsTrackingEnabled: result.isAvailableUnitsTrackingEnabled,
            isSyncEnabled: result.isSyncEnabled,
            name: result.retailName,
            ...(currencySelectOptions.length > 0 && {
              overriddenExternalCurrency: result.overriddenExternalCurrency,
            }),
          },
          retailSetupId: result.retailSetupId,
        });
      }
    });
  }

  #setupSyncProductsToastEffect(): void {
    effect(() => {
      const action = this.#store.syncProductsAction();
      if (action === 'syncError' || action === 'syncByPlansError') {
        untracked(() => {
          this.#syncProductsDialogRef?.close();
          this.#syncProductsDialogRef = null;
          this.#store.clearSyncProductsAction();
          this.#toastService.add({
            delay: 5000,
            message: this.#translateService.instant('retailSetup.syncRetailProducts.syncError') as string,
            sentiment: AlertSentiment.danger,
          });
        });
      } else if (action === 'syncByPlansSuccess') {
        untracked(() => {
          this.#store.clearSyncProductsAction();
          this.syncedPlans.set(this.retailSetup()?.plans ?? []);
          this.#toastService.add({
            delay: 5000,
            messageTemplate: this.syncByPlansToastTemplate(),
            sentiment: AlertSentiment.info,
            title: this.#translateService.instant('retailSetup.syncRetailProducts.syncByPlansTitle') as string,
          });
        });
      } else if (action === 'syncSuccess') {
        this.#store.clearSyncProductsAction();
      }
    });
  }

  #setupUpdateToastEffect(): void {
    effect(() => {
      const action = this.#store.retailAction();
      if (action === 'updateSuccess' || action === 'updateError') {
        untracked(() => {
          this.#store.clearRetailAction();
          this.#toastService.add({
            delay: 5000,
            message: this.#translateService.instant(`retailSetup.editIntegrationForm.${action}`) as string,
            sentiment: action === 'updateSuccess' ? AlertSentiment.positive : AlertSentiment.danger,
          });
        });
      }
    });
  }

  #syncProducts(retailSetupId: string): void {
    this.#syncProductsDialogRef = this.#dialogService.openModal(this.syncProductsDialogTemplate(), {
      size: 'sm',
    });
    this.#store.syncRetailProducts(retailSetupId);
  }

  #triggerProductSync(setup: RetailSetup): void {
    if (setup.plans.length > 0) {
      this.#store.syncRetailProductsByPlans(setup.id);
      return;
    }

    this.#syncProducts(setup.id);
  }
}
