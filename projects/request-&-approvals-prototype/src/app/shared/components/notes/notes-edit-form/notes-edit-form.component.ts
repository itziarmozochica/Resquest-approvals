import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  input,
  Input,
  OnChanges,
  Output,
  output,
  SimpleChanges,
} from '@angular/core';
import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
  UntypedFormBuilder,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { CommonEditFormComponent } from '@fz-original/app/modules/sessions/shared/components/common-edit-form/common-edit-form.component';
import { MessageModalComponent } from '@fz-original/app/shared/components/message-modal/message-modal.component';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { noteAudience, NoteAudienceET, noteAudienceLabelKey } from '@fz-original/app/shared/models/customer-note/note-audience.model';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { IgntAlertComponent } from '@ignite/common';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';

export interface NoteInput {
  id: string;
  message: string;
  modified_at: string;
  title: string | null;
  username: string | null;
}

export type NoteChanges = {
  message: string;
  title: string | null;
};

export const noteEditFormMode = {
  Update: 'UPDATE',
  Create: 'CREATE',
} as const;

export type NoteEditFormModeET = (typeof noteEditFormMode)[keyof typeof noteEditFormMode];

const AtLeastOneFilledValidator = (): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup)) {
      return null;
    }

    const group = control as FormGroup;
    const fields = [];

    for (const field in group.controls) {
      if (Object.prototype.hasOwnProperty.call(group.controls, field)) {
        const controlValue = group.get(field);
        if (controlValue) {
          fields.push(controlValue.value);
        }
      }
    }

    const result = fields.filter(field => {
      if (typeof field === 'string') {
        return field.trim().length > 0;
      }
      return field != null;
    });

    const valid = result.length > 0;

    return valid
      ? null
      : {
          atLeastOneFilledValidator: true,
        };
  };
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconsModule, IgntAlertComponent, IgntRadioComponent, NgTemplateOutlet, PipesModule, ReactiveFormsModule, TranslateModule],
  selector: 'app-notes-edit-form',
  styleUrls: [
    '../../../../modules/sessions/shared/components/common-edit-form/common-edit-form.component.scss',
    './notes-edit-form.component.scss',
  ],
  templateUrl: './notes-edit-form.component.html',
})
export class NotesEditFormComponent extends CommonEditFormComponent<NoteChanges> implements OnChanges {
  static readonly CUSTOMER_MESSAGE_MAX_LENGTH = 2000;
  readonly #formBuilder = inject(UntypedFormBuilder);
  readonly audience = input<NoteAudienceET>(noteAudience.Internal);
  readonly audienceChange = output<NoteAudienceET>();
  protected readonly audienceLabelKey = noteAudienceLabelKey;
  readonly availableAudiences = input<NoteAudienceET[]>([]);
  readonly hasSaveError = input(false);
  /** Typed values to restore over `note`, set through the form so Save can resubmit them as they are. */
  readonly pendingChanges = input<NoteChanges | null>(null);
  protected readonly isCustomerAudience = computed(() => this.audience() === noteAudience.Customer);
  readonly isAppendOnlyMode = input(false);
  protected readonly messageMaxLength = computed(() =>
    this.isCustomerAudience() ? NotesEditFormComponent.CUSTOMER_MESSAGE_MAX_LENGTH : null,
  );
  @Input() mode: NoteEditFormModeET = noteEditFormMode.Create;
  @Input() note: NoteInput | null = null;
  @Input() showValidationAppMessage = false;
  @Input() override timezone!: string;
  @Output() override formChanges: EventEmitter<NoteChanges | null> = new EventEmitter<NoteChanges | null>();

  @Output() deleteNote: EventEmitter<void> = new EventEmitter<void>();

  readonly NoteEditFormMode = noteEditFormMode;
  readonly #modalService = inject(NgbModal);
  readonly #translateService = inject(TranslateService);

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (this.mode === noteEditFormMode.Create && this.note === null) ||
      (this.mode === noteEditFormMode.Update && changes.note?.currentValue)
    ) {
      this.loadForm();
    } else if (changes.note?.previousValue) {
      this.reset();
    }

    const pendingChanges = this.pendingChanges();
    if (changes.pendingChanges && pendingChanges !== null && this.formGroup) {
      this.formGroup.setValue({ message: pendingChanges.message, title: pendingChanges.title });
    }
  }

  protected initForm(): void {
    this.formGroup = this.#formBuilder.group(
      {
        title: [this.note?.title ?? null, [Validators.maxLength(50)]],
        message: [this.note?.message ?? '', []],
      },
      { validators: [AtLeastOneFilledValidator()] },
    );
  }

  protected updateForm(): void {
    this.formGroup.setValue(
      {
        title: this.note?.title ?? null,
        message: this.note?.message ?? '',
      },
      { emitEvent: false },
    );
  }

  override save(): void {
    const titleValue = this.formGroup?.get('title')?.value || '';
    const messageValue = this.formGroup?.get('message')?.value || '';
    const isTitleEmpty = !titleValue || titleValue.trim() === '';
    const isMessageEmpty = !messageValue || messageValue.trim() === '';

    if (isTitleEmpty && isMessageEmpty) {
      this.#openEmptyNoteModal('boxOffice.order.notes.emptyNoteMessage');
      return;
    }

    if (isMessageEmpty && this.isCustomerAudience()) {
      this.#openEmptyNoteModal('boxOffice.order.notes.customerEmptyNoteMessage');
      return;
    }

    super.save();
  }

  delete(): void {
    this.deleteNote.emit();
  }

  onAudienceSelect(audience: NoteAudienceET): void {
    if (audience !== this.audience()) {
      this.audienceChange.emit(audience);
    }
  }

  isSaveButtonDisabled(): boolean {
    return super.isSaveButtonDisabled();
  }

  #openEmptyNoteModal(messageKey: string): void {
    const modal = this.#modalService.open(MessageModalComponent, {
      centered: true,
    });

    modal.componentInstance.title = this.#translateService.instant('boxOffice.order.notes.emptyNoteTitle');
    modal.componentInstance.messages = [this.#translateService.instant(messageKey)];
    modal.componentInstance.acceptButtonLabel = this.#translateService.instant('boxOffice.order.notes.keepEditing');
    modal.componentInstance.cancelButtonLabel = this.#translateService.instant('boxOffice.order.notes.discardNote');

    modal.componentInstance.responseEmitter.pipe(take(1)).subscribe((response: boolean) => {
      if (!response) {
        this.cancel();
      }
    });
  }

  protected emitNewFormValue(newValue: NoteChanges): void {
    const newValueFields = newValue && (Object.keys(newValue) as Array<keyof NoteChanges>);
    const filteredValue = newValueFields?.reduce((partial, field) => this.#makeNullIfEmpty(field, partial), newValue);

    this.formChanges.emit(filteredValue ?? null);
    this.reset();
  }

  #makeNullIfEmpty(field: keyof NoteChanges, value: NoteChanges): NoteChanges {
    const copy = { ...value };
    const control = this.formGroup.get(field);
    if (control && control.value === '' && field === 'title') {
      copy.title = null;
    }
    return copy;
  }
}
