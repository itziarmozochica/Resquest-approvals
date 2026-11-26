import { CoverageRule } from '../enums/coverage-rule.enum';
import { SignerRole } from '../enums/signer-role.enum';
import { LocalizedText } from './localized-text.model';
import { ScopeSelection } from './scope-selection.model';

export interface RequirementDraft {
  agreementIds: [string, ...string[]];
  coverageRule: CoverageRule;
  scope: ScopeSelection;
  signerRole: SignerRole;
  translations: LocalizedText;
}
