import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntButtonComponent } from '@ignite/common';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { BaseErrorResponse } from '../../../../../shared/models/base-response';
import { ErrorModalService } from '../../../../../shared/services/error-modal/error-modal.service';
import { Shift } from '../../../shared/models/shifts.model';
import { ShiftAbstractFactoryService } from '../../services/shift-abstract-factory/shift-abstract-factory.service';
import { addShiftNote } from '../../tracking/events/add-shift-note.event';
import { editShiftNote } from '../../tracking/events/edit-shift-note.event';
import { buildShiftNoteData } from '../../tracking/utils/shift-note-data';

export const SHIFT_NOTES_MAX_LENGTH = 500;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntTextareaFieldComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-shift-notes',
  styleUrl: './shift-notes.component.scss',
  templateUrl: './shift-notes.component.html',
})
export class ShiftNotesComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #errorModalService = inject(ErrorModalService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #shiftProviderFactory = inject(ShiftAbstractFactoryService);

  readonly shift = input.required<Shift>();

  protected readonly isEditing = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly maxLength = SHIFT_NOTES_MAX_LENGTH;
  protected readonly notesControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(SHIFT_NOTES_MAX_LENGTH)],
  });
  /** The note as last saved: the shift's own comment, until this card saves a new one. */
  protected readonly savedNotes = linkedSignal(() => this.shift().comment ?? '');

  cancelEditing(): void {
    this.isEditing.set(false);
  }

  save(): void {
    if (this.notesControl.invalid || this.isSaving()) {
      return;
    }

    const shift = this.shift();
    const notes = this.notesControl.value;
    const hadNotes = !!this.savedNotes();
    this.isSaving.set(true);

    this.#shiftProviderFactory
      .getShiftSummaryProvider()
      .addShiftNotes(shift.oboVenueId, shift.id, notes)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (error: BaseErrorResponse) => this.#errorModalService.open({ error }),
        next: () => {
          this.savedNotes.set(notes);
          this.isEditing.set(false);
          const data = buildShiftNoteData(shift, notes, () => this.#shiftProviderFactory.getLeftOver(shift));
          this.#fzTracking.track(hadNotes ? editShiftNote(data) : addShiftNote(data));
        },
      });
  }

  startEditing(): void {
    this.notesControl.setValue(this.savedNotes());
    this.isEditing.set(true);
  }
}
