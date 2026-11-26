import { DynamicFieldType } from '../enums/dynamic-field-type.enum';

export interface DynamicFieldResponse {
  description: string | null;
  field_name: string;
  field_type: DynamicFieldType;
  id: string;
  is_calculated: boolean;
  is_required: boolean;
  units: string | null;
}

export interface DynamicFieldsResponse {
  can_write: boolean;
  fields: DynamicFieldResponse[];
  values: Record<string, Record<string, string | null>>;
}

export interface DynamicFieldValuePayload {
  id: string;
  value: string | null;
}

export interface WriteDynamicFieldsPayload {
  fields: DynamicFieldValuePayload[];
}
