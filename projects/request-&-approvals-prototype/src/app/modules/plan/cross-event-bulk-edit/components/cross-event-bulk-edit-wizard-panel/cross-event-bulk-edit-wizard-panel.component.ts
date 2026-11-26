import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { InventoryTicketTypesBulkEditService } from '@fz-original/app/modules/inventory/inventory-ticket-types/services/inventory-ticket-types-bulk-edit.service';

import { CrossEventBulkEditPanelStep } from '../../models/store/cross-event-bulk-edit-store.model';
import { CrossEventBulkEditStore } from '../../store/cross-event-bulk-edit.store';
import { CrossEventBulkEditPropertiesPanelComponent } from '../cross-event-bulk-edit-properties-panel/cross-event-bulk-edit-properties-panel.component';
import { CrossEventBulkEditTicketTypePanelComponent } from '../cross-event-bulk-edit-ticket-type-panel/cross-event-bulk-edit-ticket-type-panel.component';
import { CrossEventBulkEditValuesPanelComponent } from '../cross-event-bulk-edit-values-panel/cross-event-bulk-edit-values-panel.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrossEventBulkEditPropertiesPanelComponent, CrossEventBulkEditTicketTypePanelComponent, CrossEventBulkEditValuesPanelComponent],
  providers: [InventoryTicketTypesBulkEditService],
  selector: 'app-cross-event-bulk-edit-wizard-panel',
  styleUrl: './cross-event-bulk-edit-wizard-panel.component.scss',
  templateUrl: './cross-event-bulk-edit-wizard-panel.component.html',
})
export class CrossEventBulkEditWizardPanelComponent {
  readonly #store = inject(CrossEventBulkEditStore);

  protected readonly panelStep = this.#store.panelStep;
  protected readonly steps = CrossEventBulkEditPanelStep;
}
