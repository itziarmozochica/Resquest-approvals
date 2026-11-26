import { CreateItem } from './create-item.model';
import { RequirementError } from './requirement-error.model';

export interface RequirementFailure {
  error: RequirementError;
  isScreenLevel: boolean;
  item: CreateItem;
}
