import { CoverageRule } from '../enums/coverage-rule.enum';
import { SignerRole } from '../enums/signer-role.enum';
import { LocalizedText } from './localized-text.model';
import { RequirementScope } from './requirement-scope.model';

export interface AgreementRequirement {
  active: boolean;
  agreementId: string;
  coverageRule: CoverageRule;
  createdAt: string;
  id: number;
  mainPlanId: number;
  scope: RequirementScope;
  signerRole: SignerRole;
  translations: LocalizedText;
  updatedAt: string;
}
