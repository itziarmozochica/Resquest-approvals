export const userMfaPolicyStatus = {
  notRequired: 'not_required',
  gracePeriod: 'grace_period',
  required: 'required',
} as const;

export type UserMfaPolicyStatus = (typeof userMfaPolicyStatus)[keyof typeof userMfaPolicyStatus];

export const userMfaPolicyReason = {
  superuser: 'superuser',
  organization: 'organization',
  role: 'role',
  permission: 'permission',
} as const;

export type UserMfaPolicyReason = (typeof userMfaPolicyReason)[keyof typeof userMfaPolicyReason];

export interface UserMfaPolicyData {
  status: UserMfaPolicyStatus;
  enforced_at: string | null;
  reason: UserMfaPolicyReason | null;
}

export interface UserMfaStatusData {
  enrolled: boolean;
  excluded: boolean;
  policy: UserMfaPolicyData;
}

export interface UserMfaPolicy {
  status: UserMfaPolicyStatus;
  enforcedAt: string | null;
  reason: UserMfaPolicyReason | null;
}

export interface UserMfaStatus {
  enrolled: boolean;
  excluded: boolean;
  policy: UserMfaPolicy;
}

export function mapUserMfaStatusFromApi(data: UserMfaStatusData): UserMfaStatus {
  return {
    enrolled: data.enrolled,
    excluded: data.excluded,
    policy: {
      status: data.policy.status,
      enforcedAt: data.policy.enforced_at,
      reason: data.policy.reason,
    },
  };
}
