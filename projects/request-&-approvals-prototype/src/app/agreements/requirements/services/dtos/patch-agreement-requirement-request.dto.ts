import { SignerRole } from '../../enums/signer-role.enum';
import { TranslationsDto } from './translations.dto';

export interface PatchAgreementRequirementRequestDto {
  active?: boolean;
  signer_role?: SignerRole;
  translations?: TranslationsDto;
}
