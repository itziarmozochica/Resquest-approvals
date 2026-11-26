import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import type { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import { TranslateModule } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';

import type { EditControlSyncModalData, EditControlSyncModalResult } from '../../models/dual-screen-sync/edit-control-sync-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.enter)': 'onEnterKeydown($event)',
  },
  imports: [IgntButtonComponent, IgntDialogModule, IgntInputFieldComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-edit-control-sync-modal',
  standalone: true,
  templateUrl: './edit-control-sync-modal.component.html',
})
export class EditControlSyncModalComponent {
  readonly dialogData = inject<EditControlSyncModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<EditControlSyncModalResult>>(IGNT_DIALOG_REF);
  readonly fieldInput = viewChild<IgntInputFieldComponent>('fieldInput');

  protected readonly inputType = this.dialogData.inputType;
  protected readonly label = this.dialogData.label;
  protected readonly syncedFieldControl = this.dialogData.formControl as FormControl<string>;
  protected readonly formErrors: IngtFormError[] = this.dialogData.formErrors;
  protected readonly title = this.dialogData.title;

  protected readonly isDisabled = toSignal(
    this.syncedFieldControl.valueChanges.pipe(
      startWith(this.syncedFieldControl.value),
      map(value => (value ?? '').trim() === '' || this.syncedFieldControl.invalid),
    ),
  );

  confirm(): void {
    if (this.isDisabled()) {
      return;
    }
    this.#dialogRef.close({
      confirmed: true,
    });
  }

  protected applyGestureFocus(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest('[data-testid="edit-control-sync-modal-confirm"]') !== null) {
      return;
    }
    this.#focusFieldInput();
  }

  protected onEnterKeydown(event: Event): void {
    event.preventDefault();
    this.confirm();
  }

  #focusFieldInput(): void {
    this.fieldInput()?.inputElement?.nativeElement?.focus();
  }
}
