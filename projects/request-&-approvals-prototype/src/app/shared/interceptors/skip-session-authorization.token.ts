import { HttpContextToken } from '@angular/common/http';

/** Keep `AddHeadersInterceptor` from attaching the stored session token to a request. */
export const SKIP_SESSION_AUTHORIZATION = new HttpContextToken<boolean>(() => false);
