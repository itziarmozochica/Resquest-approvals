import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

import moment from 'moment-timezone';

import { DynamicFieldControlKind } from '../enums/dynamic-field-control-kind.enum';
import { DynamicFieldErrorKey } from '../enums/dynamic-field-error-key.enum';
import { DynamicFieldType } from '../enums/dynamic-field-type.enum';
import { DynamicFieldControlValue, DynamicFieldRow, DynamicFieldsForm } from '../models/dynamic-fields-form.model';
import { DynamicField, DynamicFieldValue, DynamicFieldValuesByFieldId, DynamicFieldValueWrite } from '../models/dynamic-fields.model';

const STORED_TRUE = 'true';
const STORED_DATE_FORMAT = 'YYYY-MM-DD';
const STORED_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';
const DATETIME_LOCAL_FORMAT = 'YYYY-MM-DDTHH:mm';
const DATETIME_LOCAL_WITH_SECONDS_FORMAT = 'YYYY-MM-DDTHH:mm:ss';
const DATETIME_LOCAL_FORMATS = [DATETIME_LOCAL_WITH_SECONDS_FORMAT, DATETIME_LOCAL_FORMAT];
const UNAVAILABLE_TIMEZONE_DISPLAY_ZONE = 'UTC';

export function buildDynamicFieldsForm(
  fields: DynamicField[],
  values: DynamicFieldValuesByFieldId,
  timezone: string | null,
): DynamicFieldsForm {
  return new FormGroup(
    Object.fromEntries(fields.map(field => [field.id, buildDynamicFieldControl(field, values[field.id] ?? null, timezone)])),
  );
}

function buildDynamicFieldControl(
  field: DynamicField,
  value: DynamicFieldValue,
  timezone: string | null,
): FormControl<DynamicFieldControlValue> {
  const control = new FormControl<DynamicFieldControlValue>(toControlValue(field.fieldType, value, timezone), {
    validators: buildDynamicFieldValidators(field),
  });

  if (field.isCalculated || isDatetimeWithoutTimezone(field.fieldType, timezone)) {
    control.disable({ emitEvent: false });
  }

  return control;
}

function isDatetimeWithoutTimezone(fieldType: DynamicFieldType, timezone: string | null): boolean {
  return fieldType === DynamicFieldType.Datetime && timezone === null;
}

function toControlValue(fieldType: DynamicFieldType, value: DynamicFieldValue, timezone: string | null): DynamicFieldControlValue {
  if (fieldType === DynamicFieldType.Boolean) {
    return value === STORED_TRUE;
  }

  if (fieldType === DynamicFieldType.Date) {
    return toDateValue(value);
  }

  return fieldType === DynamicFieldType.Datetime ? toDatetimeLocalValue(value, timezone) : value;
}

function toDateValue(value: DynamicFieldValue): DynamicFieldValue {
  return value !== null && moment(value, STORED_DATE_FORMAT, true).isValid() ? value : null;
}

function toDatetimeLocalValue(value: DynamicFieldValue, timezone: string | null): DynamicFieldValue {
  if (value === null) {
    return null;
  }

  const instant = moment.parseZone(value, STORED_DATETIME_FORMAT, true);
  if (!instant.isValid()) {
    return null;
  }

  return instant
    .tz(timezone ?? UNAVAILABLE_TIMEZONE_DISPLAY_ZONE)
    .format(instant.seconds() === 0 ? DATETIME_LOCAL_FORMAT : DATETIME_LOCAL_WITH_SECONDS_FORMAT);
}

function buildDynamicFieldValidators(field: DynamicField): ValidatorFn[] {
  const validators: ValidatorFn[] = [];

  if (field.isRequired) {
    validators.push(requiredValueValidator);
  }

  if (field.fieldType === DynamicFieldType.Object || field.fieldType === DynamicFieldType.Array) {
    validators.push(jsonValidator(field.fieldType));
  }

  return validators;
}

function requiredValueValidator(control: AbstractControl<DynamicFieldControlValue>): ValidationErrors | null {
  return isEmptyValue(control.value) ? { [DynamicFieldErrorKey.Required]: true } : null;
}

function isEmptyValue(value: DynamicFieldControlValue): boolean {
  return value === null || (typeof value === 'string' && value.trim() === '');
}

function jsonValidator(fieldType: DynamicFieldType.Array | DynamicFieldType.Object): ValidatorFn {
  return (control: AbstractControl<DynamicFieldControlValue>) => {
    if (isEmptyValue(control.value)) {
      return null;
    }

    return isJsonOfType(String(control.value), fieldType) ? null : { [DynamicFieldErrorKey.InvalidJson]: true };
  };
}

function isJsonOfType(value: string, fieldType: DynamicFieldType.Array | DynamicFieldType.Object): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    const isArray = Array.isArray(parsed);

    return fieldType === DynamicFieldType.Array ? isArray : typeof parsed === 'object' && parsed !== null && !isArray;
  } catch {
    return false;
  }
}

export function toDynamicFieldValueWrites(
  form: DynamicFieldsForm,
  storedValues: DynamicFieldValuesByFieldId,
  fields: DynamicField[],
  timezone: string | null,
): DynamicFieldValueWrite[] {
  const fieldTypes = toFieldTypesById(fields);

  return Object.entries(form.controls)
    .filter(([id, control]) => control.enabled && (control.dirty || isUnsetBoolean(control.value, storedValues[id] ?? null)))
    .map(([id, control]) => ({ id, value: toStoredValue(control.value, fieldTypes[id], timezone) }));
}

function toFieldTypesById(fields: DynamicField[]): Record<string, DynamicFieldType> {
  return Object.fromEntries(fields.map(field => [field.id, field.fieldType]));
}

function isUnsetBoolean(value: DynamicFieldControlValue, storedValue: DynamicFieldValue): boolean {
  return typeof value === 'boolean' && storedValue === null;
}

export function toNewEntityDynamicFieldValueWrites(
  form: DynamicFieldsForm,
  fields: DynamicField[],
  timezone: string | null,
): DynamicFieldValueWrite[] {
  const fieldTypes = toFieldTypesById(fields);

  return Object.entries(form.controls)
    .filter(([, control]) => control.enabled && (typeof control.value === 'boolean' || !isEmptyValue(control.value)))
    .map(([id, control]) => ({ id, value: toStoredValue(control.value, fieldTypes[id], timezone) }));
}

export function haveSameDynamicFieldValues(first: DynamicFieldValuesByFieldId, second: DynamicFieldValuesByFieldId): boolean {
  const firstIds = Object.keys(first);
  return firstIds.length === Object.keys(second).length && firstIds.every(id => id in second && first[id] === second[id]);
}

export function toCopiedDynamicFieldValues(fields: DynamicField[], sourceValues: DynamicFieldValuesByFieldId): DynamicFieldValuesByFieldId {
  return Object.fromEntries(
    fields.filter(field => !field.isCalculated && field.id in sourceValues).map(field => [field.id, sourceValues[field.id]]),
  );
}

export function validateDynamicFieldsForm(form: DynamicFieldsForm): boolean {
  form.markAllAsTouched();
  Object.values(form.controls).forEach(control => control.updateValueAndValidity());

  return !form.invalid;
}

function toStoredValue(
  value: DynamicFieldControlValue,
  fieldType: DynamicFieldType | undefined,
  timezone: string | null,
): DynamicFieldValue {
  if (isEmptyValue(value)) {
    return null;
  }

  return fieldType === DynamicFieldType.Datetime ? toStoredDatetime(String(value), timezone) : String(value);
}

function toStoredDatetime(value: string, timezone: string | null): string {
  const instant = timezone === null ? null : moment.tz(value, DATETIME_LOCAL_FORMATS, true, timezone);

  return instant?.isValid() ? instant.format() : value;
}

export function groupDynamicFields(fields: DynamicField[]): DynamicField[][] {
  const sortedFields = [...fields].sort((first, second) => toDynamicFieldTitle(first).localeCompare(toDynamicFieldTitle(second)));

  return [
    sortedFields.filter(field => field.isRequired),
    sortedFields.filter(field => field.isCalculated),
    sortedFields.filter(field => !field.isRequired && !field.isCalculated),
  ].filter(group => group.length > 0);
}

export function toDynamicFieldTitle(field: DynamicField): string {
  const words = field.fieldName.replace(/[_-]+/g, ' ').trim().toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function toDynamicFieldLabel(field: DynamicField): string {
  const title = toDynamicFieldTitle(field);

  return field.units ? `${title} (${field.units})` : title;
}

export function toDynamicFieldControlKind(fieldType: DynamicFieldType): DynamicFieldControlKind {
  switch (fieldType) {
    case DynamicFieldType.Boolean:
      return DynamicFieldControlKind.Switch;
    case DynamicFieldType.Array:
    case DynamicFieldType.Object:
    case DynamicFieldType.Text:
      return DynamicFieldControlKind.Textarea;
    default:
      return DynamicFieldControlKind.Input;
  }
}

export function toDynamicFieldInputType(fieldType: DynamicFieldType): DynamicFieldRow['inputType'] {
  switch (fieldType) {
    case DynamicFieldType.Date:
      return 'date';
    case DynamicFieldType.Datetime:
      return 'datetime-local';
    case DynamicFieldType.Number:
      return 'number';
    default:
      return 'text';
  }
}
