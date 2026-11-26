import { computed, DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';

import { areObjectsEqual } from '@fz-original/app/app/utils/ts/ts.util';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs';

import { FIELD_NAMES, type FieldName } from '../../models/dual-screen-sync/contact-info-dual-screen-sync.model';
import type { ContactInformationOrderableFieldEnum } from '../../models/onsite-setup';
import { ContactInfoDualScreenSyncService } from './contact-info-dual-screen-sync.service';

@Injectable()
export class MainScreenContactInfoSyncService {
  readonly #contactInfoDualScreenSync = inject(ContactInfoDualScreenSyncService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #DEBOUNCE_TIME_MS = 300 as const;

  readonly activeEditField = computed(() => this.#contactInfoDualScreenSync.activeEditField());
  readonly contactInfoFormState = computed(() => this.#contactInfoDualScreenSync.sharedContactInfoState(), {
    equal: areObjectsEqual,
  });

  pushCloseEditControl(): void {
    this.#contactInfoDualScreenSync.pushCloseEditControl();
  }

  pushOpenEditControl(field: FieldName): void {
    this.#contactInfoDualScreenSync.pushOpenEditControl(field);
  }

  resetDualScreenFormBroadcast(): void {
    this.#contactInfoDualScreenSync.resetContactInfoStateSync();
  }

  setupDualScreenFormBroadcast(
    form: FormGroup,
    showEmail: boolean,
    showPhoneNumber: boolean,
    showConsent: boolean,
    fieldsOrder: ContactInformationOrderableFieldEnum[] | null = null,
  ): void {
    this.#contactInfoDualScreenSync.setHostVisibleFields(showEmail, showPhoneNumber, showConsent, fieldsOrder);
    this.#setInitialSharedState(form);
    this.#setupDualScreenFormControlSync(form);
  }

  #setInitialSharedState(form: FormGroup): void {
    for (const fieldName of FIELD_NAMES) {
      const control = form.get(fieldName);
      if (control == null) {
        continue;
      }
      this.#contactInfoDualScreenSync.pushInputChange(fieldName, String(control.value ?? ''));
    }
  }

  #setupDualScreenFormControlSync(form: FormGroup): void {
    for (const fieldName of FIELD_NAMES) {
      this.#syncFormControl(form, fieldName);
    }
  }

  #syncFormControl(formGroup: FormGroup, fieldName: FieldName): void {
    const control = formGroup.get(fieldName);
    if (control == null) {
      return;
    }
    control.valueChanges
      .pipe(
        startWith(control.value),
        map((value: unknown) => String(value ?? '')),
        debounceTime(this.#DEBOUNCE_TIME_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((synced: string) => {
        this.#contactInfoDualScreenSync.pushInputChange(fieldName, synced);
      });
  }
}
