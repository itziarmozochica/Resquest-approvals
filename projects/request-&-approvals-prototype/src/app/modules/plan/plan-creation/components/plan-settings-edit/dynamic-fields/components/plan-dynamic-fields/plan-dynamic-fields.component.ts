import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { outputFromObservable, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { ActionsBarComponent } from '@fz-original/app/shared/components/actions-bar/actions-bar.component';
import { DynamicFieldsFormComponent } from '@fz-original/app/shared/dynamic-fields/components/dynamic-fields-form/dynamic-fields-form.component';
import { DynamicFieldsForm } from '@fz-original/app/shared/dynamic-fields/models/dynamic-fields-form.model';
import { DynamicFieldValueWrite } from '@fz-original/app/shared/dynamic-fields/models/dynamic-fields.model';
import {
  buildDynamicFieldsForm,
  toDynamicFieldValueWrites,
  validateDynamicFieldsForm,
} from '@fz-original/app/shared/dynamic-fields/utils/dynamic-fields-form.util';
import { IgntToastService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs';

import { PlanSettingsDynamicFieldsFacade } from '../../services/plan-settings-dynamic-fields.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActionsBarComponent, DynamicFieldsFormComponent],
  selector: 'app-plan-dynamic-fields',
  styleUrl: './plan-dynamic-fields.component.scss',
  templateUrl: './plan-dynamic-fields.component.html',
})
export class PlanDynamicFieldsComponent {
  readonly canEditPlan = input.required<boolean>();
  readonly continueTranslationKey = input.required<string>();
  readonly mode = input.required<'creation' | 'edit'>();

  readonly continued = output<void>();

  readonly #destroyRef = inject(DestroyRef);
  readonly #dynamicFieldsFacade = inject(PlanSettingsDynamicFieldsFacade);
  readonly #toastService = inject(IgntToastService);
  readonly #translateService = inject(TranslateService);

  readonly #isSaving = signal(false);

  protected readonly fields = this.#dynamicFieldsFacade.fields;
  protected readonly isEventTimezoneUnavailable = computed(() => this.#dynamicFieldsFacade.eventTimezone() === null);
  protected readonly isEditable = computed(() => this.canEditPlan() && this.#dynamicFieldsFacade.canWrite());
  protected readonly isSaving = this.#isSaving.asReadonly();
  protected readonly form = computed(() => {
    const form = buildDynamicFieldsForm(this.fields(), this.#dynamicFieldsFacade.planValues(), this.#dynamicFieldsFacade.eventTimezone());
    if (!this.isEditable()) {
      form.disable({ emitEvent: false });
    }
    return form;
  });

  readonly dirtyChange = outputFromObservable(
    toObservable(this.form).pipe(
      switchMap(form =>
        form.events.pipe(
          map(() => form.dirty),
          startWith(false),
        ),
      ),
      distinctUntilChanged(),
    ),
  );

  protected save(continueAfterSave: boolean): void {
    const form = this.form();

    if (!validateDynamicFieldsForm(form)) {
      this.#toastService.danger(this.#translate('planSettings.errors.requiredFields'));
      return;
    }

    const writes = toDynamicFieldValueWrites(
      form,
      this.#dynamicFieldsFacade.planValues(),
      this.fields(),
      this.#dynamicFieldsFacade.eventTimezone(),
    );
    if (writes.length === 0) {
      if (continueAfterSave) {
        this.continued.emit();
      } else {
        this.#toastService.info(this.#translate('planEdition.toast.nothingToChange'));
      }
      return;
    }

    this.#write(form, writes, continueAfterSave);
  }

  #successMessageKey(continueAfterSave: boolean): string {
    if (this.mode() === 'edit') {
      return 'eventSettings.successMessage';
    }
    return continueAfterSave ? 'planSettings.success.settingsSaved' : 'planSettings.success.draftSaved';
  }

  #translate(key: string): string {
    return this.#translateService.instant(key);
  }

  #write(form: DynamicFieldsForm, writes: DynamicFieldValueWrite[], continueAfterSave: boolean): void {
    this.#isSaving.set(true);
    this.#dynamicFieldsFacade
      .save(writes)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#isSaving.set(false);
          this.#toastService.danger(
            this.#translate(this.mode() === 'edit' ? 'eventSettings.errorMessage' : 'planSettings.errors.saveFailed'),
          );
        },
        next: () => {
          this.#isSaving.set(false);
          form.markAsPristine();
          this.#toastService.positive(this.#translate(this.#successMessageKey(continueAfterSave)));
          if (continueAfterSave) {
            this.continued.emit();
          }
        },
      });
  }
}
