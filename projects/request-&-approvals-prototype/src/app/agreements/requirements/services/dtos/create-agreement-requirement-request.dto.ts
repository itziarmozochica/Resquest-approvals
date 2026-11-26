import { CoverageRule } from '../../enums/coverage-rule.enum';
import { SignerRole } from '../../enums/signer-role.enum';
import { TranslationsDto } from './translations.dto';

export interface CreateAgreementRequirementRequestDto {
  active: boolean;
  agreement_id: string;
  coverage_rule: CoverageRule;
  main_plan_id: number;
  session_type_id: number | null;
  signer_role: SignerRole;
  translations: TranslationsDto;
}
