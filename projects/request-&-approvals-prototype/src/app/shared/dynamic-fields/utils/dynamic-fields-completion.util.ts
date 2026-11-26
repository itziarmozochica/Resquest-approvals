import { DynamicField, DynamicFieldValue, DynamicFieldValuesByFieldId } from '../models/dynamic-fields.model';

export function hasMissingRequiredDynamicFieldValues(fields: DynamicField[], values: DynamicFieldValuesByFieldId): boolean {
  return fields.some(field => field.isRequired && isEmptyStoredValue(values[field.id]));
}

function isEmptyStoredValue(value: DynamicFieldValue | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}
