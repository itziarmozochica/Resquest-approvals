import { SignerRole } from '../enums/signer-role.enum';
import { LocalizedText } from './localized-text.model';

export interface RequirementPatch {
  active?: boolean;
  signerRole?: SignerRole;
  translations?: LocalizedText;
}
