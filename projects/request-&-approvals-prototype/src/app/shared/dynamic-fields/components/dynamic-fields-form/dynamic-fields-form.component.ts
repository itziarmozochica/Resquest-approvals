import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NativePickerDirective } from '@fz-original/app/shared/directives/native-picker/native-picker.directive';
import { IgntSwitchComponent } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import { TranslateService } from '@ngx-translate/core';

import { DynamicFieldControlKind } from '../../enums/dynamic-field-control-kind.enum';
import { DynamicFieldErrorKey } from '../../enums/dynamic-field-error-key.enum';
import { DynamicFieldType } from '../../enums/dynamic-field-type.enum';
import { DynamicFieldRow, DynamicFieldsForm } from '../../models/dynamic-fields-form.model';
import { DynamicField } from '../../models/dynamic-fields.model';
import {
  groupDynamicFields,
  toDynamicFieldControlKind,
  toDynamicFieldInputType,
  toDynamicFieldLabel,
  toDynamicFieldTitle,
} from '../../utils/dynamic-fields-form.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntInputFieldComponent, IgntSwitchComponent, IgntTextareaFieldComponent, NativePickerDirective, ReactiveFormsModule],
  selector: 'app-dynamic-fields-form',
  styleUrl: './dynamic-fields-form.component.scss',
  templateUrl: './dynamic-fields-form.component.html',
})
export class DynamicFieldsFormComponent {
  static readonly EMPTY_CALCULATED_VALUE = '-';
  static readonly DATE_PICKER_ICON: [string, string] = ['fal', 'calendar'];
  static readonly DATE_PICKER_FIELD_TYPES: ReadonlySet<DynamicFieldType> = new Set([DynamicFieldType.Date, DynamicFieldType.Datetime]);

  readonly fields = input.required<DynamicField[]>();
  readonly form = input.required<DynamicFieldsForm>();
  readonly isEventTimezoneUnavailable = input(false);

  protected readonly dynamicFieldControlKind = DynamicFieldControlKind;
  readonly #translateService = inject(TranslateService);
  protected readonly optionalText = computed(() => this.#translateService.instant('dynamicFields.optional'));
  protected readonly openDatePickerText = computed(() => this.#translateService.instant('dynamicFields.openDatePicker'));

  protected readonly groups = computed(() => groupDynamicFields(this.fields()).map(group => group.map(field => this.#toRow(field))));

  #errors(field: DynamicField): IngtFormError[] {
    const invalidJsonKey =
      field.fieldType === DynamicFieldType.Array ? 'dynamicFields.errors.invalidJsonArray' : 'dynamicFields.errors.invalidJsonObject';

    return [
      { message: this.#translateService.instant('dynamicFields.errors.required'), type: DynamicFieldErrorKey.Required },
      { message: this.#translateService.instant(invalidJsonKey), type: DynamicFieldErrorKey.InvalidJson },
    ];
  }

  #toRow(field: DynamicField): DynamicFieldRow {
    return {
      controlKind: toDynamicFieldControlKind(field.fieldType),
      errors: this.#errors(field),
      field,
      helperText:
        field.fieldType === DynamicFieldType.Datetime && this.isEventTimezoneUnavailable()
          ? this.#translateService.instant('dynamicFields.timezoneUnavailable')
          : '',
      inputType: toDynamicFieldInputType(field.fieldType),
      isOptional: !field.isRequired && !field.isCalculated,
      label: toDynamicFieldLabel(field),
      placeholder: field.isCalculated
        ? DynamicFieldsFormComponent.EMPTY_CALCULATED_VALUE
        : this.#translateService.instant('dynamicFields.placeholder'),
      title: toDynamicFieldTitle(field),
      trailIcon: DynamicFieldsFormComponent.DATE_PICKER_FIELD_TYPES.has(field.fieldType)
        ? DynamicFieldsFormComponent.DATE_PICKER_ICON
        : null,
    };
  }
}
