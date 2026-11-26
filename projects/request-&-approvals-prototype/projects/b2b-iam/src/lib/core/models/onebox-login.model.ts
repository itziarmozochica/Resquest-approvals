/** Raw (snake_case) onebox-login envelope as returned by the b2b-iam auth API. */
export interface OneboxLoginApi {
  organization_id: number;
  token: string;
  user_id: number;
}

/** Domain (camelCase) onebox-login result consumed by b2b-iam clients. */
export interface OneboxLogin {
  organizationId: number;
  token: string;
  userId: number;
}
