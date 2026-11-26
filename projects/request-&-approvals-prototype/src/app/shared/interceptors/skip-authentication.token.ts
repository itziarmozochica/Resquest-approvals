import { HttpContextToken } from '@angular/common/http';

/** Opt out of the global session guard for requests that carry their own authorisation. */
export const SKIP_AUTHENTICATION_INTERCEPTOR = new HttpContextToken<boolean>(() => false);
