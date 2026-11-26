import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { InventoryTicketTypesBulkEditService } from '@fz-original/app/modules/inventory/inventory-ticket-types/services/inventory-ticket-types-bulk-edit.service';
import { RICH_TEXT_EDITOR_INLINE_LINK_LISTS_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntRichTextEditorComponent } from '@ignite/rich-text-editor';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntCheckboxComponent,
    IgntInputFieldComponent,
    IgntRichTextEditorComponent,
    IgntTypeaheadModule,
    MultiSelectModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-bulk-edit-values-step',
  standalone: true,
  styleUrl: './bulk-edit-values-step.component.scss',
  templateUrl: './bulk-edit-values-step.component.html',
})
export class BulkEditValuesStepComponent {
  readonly inlineLinkListsFeatures = RICH_TEXT_EDITOR_INLINE_LINK_LISTS_FEATURES;

  protected readonly bulkEditService = inject(InventoryTicketTypesBulkEditService);
}
