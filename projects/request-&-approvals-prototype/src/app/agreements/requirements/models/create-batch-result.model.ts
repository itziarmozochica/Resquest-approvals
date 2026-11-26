import { AgreementRequirement } from './agreement-requirement.model';
import { RequirementFailure } from './requirement-failure.model';

export interface CreateBatchResult {
  failed: RequirementFailure[];
  ok: AgreementRequirement[];
}
