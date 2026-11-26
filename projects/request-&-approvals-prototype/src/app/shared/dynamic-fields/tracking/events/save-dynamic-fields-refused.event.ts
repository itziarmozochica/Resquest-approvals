import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { DynamicFieldEntity } from '../../enums/dynamic-field-entity.enum';

export interface SaveDynamicFieldsRefusedData {
  entity: DynamicFieldEntity;
  planId: number;
  status: number;
}

export const saveDynamicFieldsRefused = defineEvent<SaveDynamicFieldsRefusedData>('dynamic.fields.save.refused');
