import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { DynamicFieldEntity } from '../../enums/dynamic-field-entity.enum';

export interface SaveDynamicFieldsData {
  entity: DynamicFieldEntity;
  fieldNames: string[];
  planId: number;
}

export const saveDynamicFields = defineEvent<SaveDynamicFieldsData>('dynamic.fields.save');
