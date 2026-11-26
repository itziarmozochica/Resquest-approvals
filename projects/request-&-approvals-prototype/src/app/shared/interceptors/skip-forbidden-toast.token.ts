import { HttpContextToken } from '@angular/common/http';

/** Opt out of the generic access-forbidden toast for requests that report a `403` themselves. */
export const SKIP_FORBIDDEN_TOAST = new HttpContextToken<boolean>(() => false);
