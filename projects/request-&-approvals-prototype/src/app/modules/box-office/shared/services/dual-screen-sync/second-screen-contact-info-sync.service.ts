import { computed, effect, inject, Injectable, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { areObjectsEqual } from '@fz-original/app/app/utils/ts/ts.util';
import { IgntDialogService, type IgntDialogRef } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, take, takeUntil } from 'rxjs';

import { EditControlSyncModalComponent } from '../../components/edit-control-sync-modal/edit-control-sync-modal.component';
import { contactInfoSyncFieldConfigForField } from '../../helpers/contact-info-field-validators';
import type { ContactInfoFormControls, FieldName } from '../../models/dual-screen-sync/contact-info-dual-screen-sync.model';
import type { EditControlSyncModalData, EditControlSyncModalResult } from '../../models/dual-screen-sync/edit-control-sync-modal.model';
import { ContactInfoDualScreenSyncService } from './contact-info-dual-screen-sync.service';

@Injectable()
export class SecondScreenContactInfoSyncService {
  readonly #contactInfoDualScreenSync = inject(ContactInfoDualScreenSyncService);
  readonly #igntDialogService = inject(IgntDialogService);
  readonly #translate = inject(TranslateService);
  #contactForm: FormGroup<ContactInfoFormControls> | null = null;
  #editDialogRef: IgntDialogRef<EditControlSyncModalResult> | null = null;
  readonly #DEBOUNCE_TIME_MS = 300 as const;

  readonly activeEditField = computed(() => this.#contactInfoDualScreenSync.activeEditField());
  readonly contactInfoFormState = computed(() => this.#contactInfoDualScreenSync.sharedContactInfoState(), {
    equal: areObjectsEqual,
  });
  readonly showConsent = computed(() => this.#contactInfoDualScreenSync.showConsent());
  readonly showEmail = computed(() => this.#contactInfoDualScreenSync.showEmail());
  readonly showPhoneNumber = computed(() => this.#contactInfoDualScreenSync.showPhoneNumber());
  readonly fieldsOrder = computed(() => this.#contactInfoDualScreenSync.fieldsOrder());
  readonly visibilityResolved = computed(() => this.#contactInfoDualScreenSync.visibilityResolved());

  constructor() {
    this.#contactInfoDualScreenSync.requestVisibleFields();

    effect(() => {
      const field = this.activeEditField();
      untracked(() => this.#syncEditDialogWithField(field));
    });
  }

  registerContactForm(form: FormGroup<ContactInfoFormControls>): void {
    this.#contactForm = form;
  }

  #fieldToInputType(field: FieldName): 'email' | 'tel' | 'text' {
    if (field === 'email') {
      return 'email';
    }
    if (field === 'phoneNumber') {
      return 'tel';
    }
    return 'text';
  }

  #syncEditDialogWithField(field: FieldName | null): void {
    if (field === null) {
      this.#editDialogRef?.close({
        confirmed: true,
      });
      this.#editDialogRef = null;
      return;
    }

    const contactForm = this.#contactForm;
    if (contactForm === null) {
      return;
    }

    const control = contactForm.get(field);
    if (control === null || control === undefined) {
      return;
    }

    this.#editDialogRef?.close();

    const fieldValidation = contactInfoSyncFieldConfigForField(field, this.#translate);
    control.setValidators(fieldValidation.validators);
    control.updateValueAndValidity({ emitEvent: true });

    const ref = this.#igntDialogService.openModal<EditControlSyncModalResult, EditControlSyncModalData>(EditControlSyncModalComponent, {
      data: {
        formErrors: fieldValidation.customFormErrors,
        formControl: control,
        inputType: this.#fieldToInputType(field),
        label: this.#translate.instant(`form.field.${field}`),
        title: this.#translate.instant('boxOffice.contactInformation'),
      },
      disableCloseShortcuts: true,
      size: 'sm',
    });

    this.#editDialogRef = ref;
    const constrolValueBackup = control.value;

    ref.closed$.pipe(take(1)).subscribe((result: EditControlSyncModalResult | undefined) => {
      if (this.#editDialogRef !== ref) {
        return;
      }
      this.#editDialogRef = null;
      if (result?.confirmed === true) {
        this.#contactInfoDualScreenSync.pushCloseEditControl();
      } else {
        control.setValue(constrolValueBackup);
        this.#contactInfoDualScreenSync.pushInputChange(field, constrolValueBackup);
        this.#contactInfoDualScreenSync.pushCloseEditControl();
      }
    });

    control.valueChanges
      .pipe(debounceTime(this.#DEBOUNCE_TIME_MS), distinctUntilChanged(), takeUntil(ref.closed$))
      .subscribe((value: string) => {
        this.#contactInfoDualScreenSync.pushInputChange(field, value);
      });
  }
}
