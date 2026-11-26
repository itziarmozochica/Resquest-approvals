import { HttpContextToken } from '@angular/common/http';

/** Opt out of the generic retry policy for requests that own their own. */
export const SKIP_RETRY_INTERCEPTOR = new HttpContextToken<boolean>(() => false);
