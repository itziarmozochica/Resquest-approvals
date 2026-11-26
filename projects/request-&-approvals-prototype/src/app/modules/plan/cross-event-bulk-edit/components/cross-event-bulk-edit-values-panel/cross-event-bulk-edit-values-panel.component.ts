import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BulkEditValuesStepComponent } from '@fz-original/app/modules/inventory/inventory-ticket-types/inventory-ticket-types-bulk-edit/steps/bulk-edit-values-step/bulk-edit-values-step.component';
import { InventoryTicketTypesBulkEditService } from '@fz-original/app/modules/inventory/inventory-ticket-types/services/inventory-ticket-types-bulk-edit.service';
import { SessionTypeBulkEditProperty } from '@fz-original/app/shared/services/sessions/session-type.model';
import { ProductTaxRate } from '@fz-original/app/shared/services/tax-area/product-tax-area.model';
import { ProductTypeAssignability } from '@fz-original/app/shared/services/tax-area/product-type-assignability.enum';
import { TaxAreaService } from '@fz-original/app/shared/services/tax-area/tax-area.service';
import {
  IgntAlertComponent,
  IgntButtonComponent,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
  IgntDialogService,
} from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, EMPTY, forkJoin, map } from 'rxjs';

import { CrossEventBulkEditPanelStep } from '../../models/store/cross-event-bulk-edit-store.model';
import { CrossEventBulkEditStore } from '../../store/cross-event-bulk-edit.store';
import { neededSessionTypesForPicker } from '../../utils/cross-event-bulk-edit-needed-session-types.util';
import { crossEventBulkEditTaxAreaRequests, uniqueProductTaxRates } from '../../utils/cross-event-bulk-edit-tax-area.util';
import { CrossEventBulkEditAppliesToComponent } from '../cross-event-bulk-edit-applies-to/cross-event-bulk-edit-applies-to.component';
import { CrossEventBulkEditReviewDialogComponent } from '../cross-event-bulk-edit-review-dialog/cross-event-bulk-edit-review-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BulkEditValuesStepComponent,
    CrossEventBulkEditAppliesToComponent,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    TranslateModule,
  ],
  selector: 'app-cross-event-bulk-edit-values-panel',
  styleUrl: './cross-event-bulk-edit-values-panel.component.scss',
  templateUrl: './cross-event-bulk-edit-values-panel.component.html',
})
export class CrossEventBulkEditValuesPanelComponent {
  readonly #bulkEditService = inject(InventoryTicketTypesBulkEditService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #isFormInvalid = signal(true);
  readonly #loadFailed = signal(false);
  readonly #store = inject(CrossEventBulkEditStore);
  readonly #needsProductTaxRates = computed(() => this.#store.selectedProperties().includes(SessionTypeBulkEditProperty.productType));
  readonly #taxAreaService = inject(TaxAreaService);

  protected readonly isContinueUnavailable = computed(
    () =>
      this.#store.isSubmitting() ||
      (this.#needsProductTaxRates() && this.#loadFailed()) ||
      this.#isFormInvalid() ||
      this.#store.selectedProperties().length === 0,
  );
  protected readonly isSubmitting = this.#store.isSubmitting;
  protected readonly loadFailed = this.#loadFailed.asReadonly();
  protected readonly selectedPlanCount = computed(() => this.#store.selectedPlanIds().length);
  protected readonly selectedTicketTypeCount = computed(() => this.#store.selectedTicketTypeIds().length);

  constructor() {
    this.#bulkEditService.setSelectedProperties([...this.#store.selectedProperties()]);
    this.#bulkEditService.setSelectedSessionTypeIds([...this.#store.selectedTicketTypeIds()]);
    this.#applyValuesContext([]);
    this.#bulkEditService.valuesFormGroup.statusChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#isFormInvalid.set(this.#bulkEditService.isValuesSaveDisabled());
    });
    this.#loadProductTaxRates();
  }

  protected onContinue(): void {
    if (this.isContinueUnavailable()) {
      return;
    }

    this.#store.setValues(this.#bulkEditService.getValues());
    this.#dialog.openModal<boolean>(CrossEventBulkEditReviewDialogComponent, {
      disableCloseShortcuts: true,
      injector: this.#injector,
      size: 'sm',
    });
  }

  protected onGoBack(): void {
    if (this.#store.isSubmitting()) {
      return;
    }

    this.#store.setPanelStep(CrossEventBulkEditPanelStep.properties);
  }

  #applyValuesContext(productTaxRates: ProductTaxRate[]): void {
    this.#bulkEditService.setValuesStepContext({
      productTaxRates,
      sessionTypeGroups: this.#store.sessionTypeGroups(),
      sessionTypes: neededSessionTypesForPicker(
        this.#store.sessionTypes(),
        this.#store.selectedTicketTypeIds(),
        this.#store.sessionTypePlanIds(),
      ),
    });
    this.#bulkEditService.syncValuesFormControls();
    this.#isFormInvalid.set(this.#bulkEditService.isValuesSaveDisabled());
  }

  #loadProductTaxRates(): void {
    if (!this.#needsProductTaxRates()) {
      return;
    }

    const requests = crossEventBulkEditTaxAreaRequests(this.#store.selectedPlanIds(), this.#store.planPlaceIds());
    if (requests.length === 0) {
      return;
    }

    forkJoin(
      requests.map(request =>
        this.#taxAreaService
          .getTaxArea(request.planId, request.placeId, ProductTypeAssignability.SessionType)
          .pipe(map(response => response.data?.productTaxRates ?? [])),
      ),
    )
      .pipe(
        catchError(() => {
          this.#loadFailed.set(true);
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(productTaxRateLists => {
        this.#applyValuesContext(uniqueProductTaxRates(productTaxRateLists));
      });
  }
}
