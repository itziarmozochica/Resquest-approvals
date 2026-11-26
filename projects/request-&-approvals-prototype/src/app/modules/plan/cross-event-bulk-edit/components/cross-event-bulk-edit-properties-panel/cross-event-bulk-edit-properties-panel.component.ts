import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { BulkEditPropertiesStepComponent } from '@fz-original/app/modules/inventory/inventory-ticket-types/inventory-ticket-types-bulk-edit/steps/bulk-edit-properties-step/bulk-edit-properties-step.component';
import { SessionTypeBulkEditPropertyValue } from '@fz-original/app/shared/services/sessions/session-type.model';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntButtonComponent, IgntDialogContentComponent, IgntDialogFooterComponent, IgntDialogHeaderComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { crossEventBulkEditStepCompleted } from '../../../tracking/events/cross-event-bulk-edit-step-completed.event';
import { crossEventBulkEditHiddenProperties, crossEventBulkEditPropertyOptions } from '../../models/cross-event-bulk-edit-properties.model';
import { CrossEventBulkEditPanelStep } from '../../models/store/cross-event-bulk-edit-store.model';
import { CrossEventBulkEditStore } from '../../store/cross-event-bulk-edit.store';
import { toEditPropertiesStepCompletedData } from '../../utils/cross-event-bulk-edit-tracking.util';
import { CrossEventBulkEditAppliesToComponent } from '../cross-event-bulk-edit-applies-to/cross-event-bulk-edit-applies-to.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BulkEditPropertiesStepComponent,
    CrossEventBulkEditAppliesToComponent,
    IgntButtonComponent,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    TranslateModule,
  ],
  selector: 'app-cross-event-bulk-edit-properties-panel',
  styleUrl: './cross-event-bulk-edit-properties-panel.component.scss',
  templateUrl: './cross-event-bulk-edit-properties-panel.component.html',
})
export class CrossEventBulkEditPropertiesPanelComponent {
  readonly #fzTracking = inject(FzTrackingService);
  readonly #store = inject(CrossEventBulkEditStore);

  protected readonly hiddenProperties: SessionTypeBulkEditPropertyValue[] = [...crossEventBulkEditHiddenProperties];
  protected readonly isContinueUnavailable = computed(() => !this.#store.canContinueFromProperties());
  protected readonly propertyOptions = crossEventBulkEditPropertyOptions;
  protected readonly restrictedProperties = this.#store.restrictedProperties;
  protected readonly selectedPlanCount = computed(() => this.#store.selectedPlanIds().length);
  protected readonly selectedProperties = this.#store.selectedProperties;
  protected readonly selectedTicketTypeCount = computed(() => this.#store.selectedTicketTypeIds().length);

  protected onContinue(): void {
    if (!this.#store.canContinueFromProperties()) {
      return;
    }

    this.#fzTracking.track(crossEventBulkEditStepCompleted(toEditPropertiesStepCompletedData(this.#store.selectedProperties())));
    this.#store.setPanelStep(CrossEventBulkEditPanelStep.values);
  }

  protected onGoBack(): void {
    this.#store.setPanelStep(CrossEventBulkEditPanelStep.ticketTypes);
  }

  protected onPropertiesChange(properties: SessionTypeBulkEditPropertyValue[]): void {
    this.#store.setSelectedProperties(properties);
  }
}
