/** Raw (snake_case) backoffice-login envelope as returned by the b2b-iam auth API. */
export interface BackofficeLoginApi {
  token: string;
  user_id: number;
}

/** Domain (camelCase) backoffice-login result consumed by b2b-iam clients. */
export interface BackofficeLogin {
  token: string;
  userId: number;
}
