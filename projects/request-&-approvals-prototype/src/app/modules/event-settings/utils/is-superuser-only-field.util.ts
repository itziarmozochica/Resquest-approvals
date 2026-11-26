import { FieldConfig } from '../models/settings-configs.model';

export function isSuperuserOnlyField(fieldConfig: FieldConfig<unknown> | undefined, isStaff: boolean, isEditableInUi = true): boolean {
  return isStaff && (fieldConfig?.visible ?? false) && (fieldConfig?.editable ?? false) && isEditableInUi;
}
