import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { RetailSetupType } from '../../../core/models/retail-setup-type.model';
import { SelectRetailFormControls } from '../../models/form/select-retail-form.model';
import { retailSelectOptions } from '../../models/retail-type.model';
import { RetailSelectOptionComponent } from '../retail-select-option/retail-select-option.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-testid]': '"retail-selection-sheet"',
  },
  imports: [ReactiveFormsModule, IgntDialogModule, IgntButtonComponent, RetailSelectOptionComponent, TranslateModule],
  selector: 'fz-retail-selection',
  standalone: true,
  styleUrl: './retail-selection.component.scss',
  templateUrl: './retail-selection.component.html',
})
export class RetailSelectionComponent {
  readonly #dialogRef = inject<IgntDialogRef<RetailSetupType | null>>(IGNT_DIALOG_REF);

  protected readonly retailSelectOptions = signal(retailSelectOptions);

  protected readonly selectRetailForm = new FormGroup<SelectRetailFormControls>({
    retailType: new FormControl<RetailSetupType | null>(null),
  });

  protected readonly retailTypeControl = this.selectRetailForm.controls.retailType;

  protected closeSelectRetailSheet(retailType: RetailSetupType | null): void {
    this.#dialogRef.close(retailType);
    this.selectRetailForm.reset();
  }
}
