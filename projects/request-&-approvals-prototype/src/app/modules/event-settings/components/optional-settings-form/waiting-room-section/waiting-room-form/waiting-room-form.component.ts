import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { switchMap } from 'rxjs';

import { WaitingRoomVisibilityService } from '../../../../services/waiting-room-visibility.service';
import { FieldSelectComponent } from '../field-select/field-select.component';
import { WaitingRoomValidationDisplayService } from '../services/waiting-room-validation-display/waiting-room-validation-display.service';
import { WaitingRoomFormGroup } from '../waiting-room-section.types';
import { hasWaitingRoomId, watchControlValue$ } from '../waiting-room-section.utils';
import {
  formI18n,
  languageOptions,
  timezoneOptions,
  visibilityModeOptions as visibilityModeOptionKeys,
  waitingRoomFormField,
  waitingRoomInvalidSubmitControlKeys,
} from './waiting-room-form.constants';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FieldSelectComponent, IgntInputFieldComponent, ReactiveFormsModule, SharedComponentsModule, TranslateModule],
  selector: 'app-waiting-room-form',
  standalone: true,
  styleUrls: ['./waiting-room-form.component.scss'],
  templateUrl: './waiting-room-form.component.html',
})
export class WaitingRoomFormComponent {
  readonly #translateService = inject(TranslateService);
  readonly #waitingRoomVisibilityService = inject(WaitingRoomVisibilityService);
  readonly #waitingRoomValidationDisplayService = inject(WaitingRoomValidationDisplayService);

  form = input.required<WaitingRoomFormGroup>();
  planType = input<string | null>(null);
  planMaxOutflow = input<number | null>(null);

  readonly formField = waitingRoomFormField;

  readonly i18n = formI18n;

  readonly showValidationErrors = this.#waitingRoomValidationDisplayService.showValidationErrors;

  readonly languageOptions: SelectOption[] = languageOptions;

  readonly timezoneOptions: SelectOption[] = timezoneOptions;

  readonly #waitingRoomId = toSignal(
    toObservable(this.form).pipe(switchMap(({ controls }) => watchControlValue$(controls.waitingRoomId))),
    { initialValue: null },
  );

  readonly showMaxOutflowSection = computed(
    () => hasWaitingRoomId(this.#waitingRoomId()) && this.#waitingRoomVisibilityService.canViewOutflowConfig(),
  );

  readonly visibilityModeOptions = computed(() =>
    visibilityModeOptionKeys.map(opt => ({
      id: opt.id,
      title: this.#translateService.instant(opt.titleKey),
    })),
  );

  readonly planTypeLabel = computed(() => {
    const type = this.planType();
    if (!type) return null;
    return this.#translateService.instant(`${formI18n.maxOutflowPlanTypePrefix}.${type}`) as string;
  });

  constructor() {
    effect(() => {
      if (!this.#waitingRoomValidationDisplayService.showValidationErrors()) {
        return;
      }

      this.#markInvalidControlsAfterSubmitAttempt();
    });
  }

  #markInvalidControlsAfterSubmitAttempt(): void {
    const controls = this.form().controls;

    for (const key of waitingRoomInvalidSubmitControlKeys) {
      const control = controls[key];

      if (control.invalid) {
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity();
      }
    }
  }

  onInputBlur(controlName: keyof WaitingRoomFormGroup['controls']): void {
    const control = this.form().controls[controlName];

    control.markAsTouched();
    control.markAsDirty();
    control.updateValueAndValidity();
  }
}
