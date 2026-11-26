import { DynamicFieldResponse, DynamicFieldsResponse, WriteDynamicFieldsPayload } from '../models/dynamic-fields-response.model';
import { DynamicField, DynamicFields, DynamicFieldValueWrite } from '../models/dynamic-fields.model';

export function toDynamicFields(response: DynamicFieldsResponse): DynamicFields {
  return {
    canWrite: response.can_write,
    fields: response.fields.map(toDynamicField),
    values: response.values,
  };
}

function toDynamicField(field: DynamicFieldResponse): DynamicField {
  return {
    description: field.description,
    fieldName: field.field_name,
    fieldType: field.field_type,
    id: field.id,
    isCalculated: field.is_calculated,
    isRequired: field.is_required,
    units: field.units,
  };
}

export function toWriteDynamicFieldsPayload(fields: DynamicFieldValueWrite[]): WriteDynamicFieldsPayload {
  return { fields: fields.map(field => ({ id: field.id, value: field.value })) };
}
