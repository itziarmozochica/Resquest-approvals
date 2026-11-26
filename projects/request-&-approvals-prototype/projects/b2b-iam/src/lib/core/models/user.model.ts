/** Business sub-object of the `/1.0/users/me` payload, as it arrives on the wire. */
export interface UserBusinessApi {
  email: string;
  id: string;
  name: string;
}

/**
 * Current-user payload as returned by `/1.0/users/me`. Only the fields b2b-iam
 * consumes are modelled; the payload also carries snake_case extras
 * (`contact_name`, `postal_code`, `tax_identification_number`, …) which map
 * through `adaptUser` if we ever need them.
 */
export interface UserApi {
  email: string;
  id: number;
  name: string;
  username: string;
  is_test_account?: boolean;
  business?: UserBusinessApi | null;
}

/** Domain business sub-object consumed by b2b-iam clients. */
export interface UserBusiness {
  email: string;
  id: string;
  name: string;
}

/** Domain current user consumed by b2b-iam clients. */
export interface User {
  email: string;
  id: number;
  name: string;
  username: string;
  /** Whether this seat is a test account. Analytics excludes these by default. */
  isTestAccount: boolean;
  business?: UserBusiness | null;
}
