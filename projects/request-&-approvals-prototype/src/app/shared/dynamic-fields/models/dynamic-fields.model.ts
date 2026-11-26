import { DynamicFieldEntity } from '../enums/dynamic-field-entity.enum';
import { DynamicFieldType } from '../enums/dynamic-field-type.enum';

export type DynamicFieldPlanEntity = DynamicFieldEntity.MainPlan | DynamicFieldEntity.MainPlanPresentationSettings;

export type DynamicFieldValue = string | null;

export type DynamicFieldValuesByFieldId = Record<string, DynamicFieldValue>;

export type DynamicFieldValuesByEntityId = Record<number, DynamicFieldValuesByFieldId>;

export interface DynamicField {
  description: string | null;
  fieldName: string;
  fieldType: DynamicFieldType;
  id: string;
  isCalculated: boolean;
  isRequired: boolean;
  units: string | null;
}

export interface DynamicFields {
  canWrite: boolean;
  fields: DynamicField[];
  values: DynamicFieldValuesByEntityId;
}

export interface DynamicFieldValueWrite {
  id: string;
  value: DynamicFieldValue;
}
