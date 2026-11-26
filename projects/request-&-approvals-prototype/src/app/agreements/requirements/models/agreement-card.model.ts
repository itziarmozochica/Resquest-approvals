import { CoverageRule } from '../enums/coverage-rule.enum';
import { SignerRole } from '../enums/signer-role.enum';

export type CardScopeKind = 'plan' | 'ticketTypes';

export interface AgreementCard {
  active: boolean;
  agreementId: string;
  coverageRule: CoverageRule;
  name: string;
  scopeKind: CardScopeKind;
  sessionTypeIds: number[];
  signerRole: SignerRole;
}
