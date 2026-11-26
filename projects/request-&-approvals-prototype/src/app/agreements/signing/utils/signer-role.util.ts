import { SignerRole } from '../../requirements/enums/signer-role.enum';

/** The answer to "Who are you signing for?" counts only while the requirement is age-based. */
export function isGuardianSignature(
  requirementRole: SignerRole,
  answeredSignerRole: Exclude<SignerRole, SignerRole.AgeBased> | null,
): boolean {
  return requirementRole === SignerRole.guardian || (requirementRole === SignerRole.AgeBased && answeredSignerRole === SignerRole.guardian);
}
