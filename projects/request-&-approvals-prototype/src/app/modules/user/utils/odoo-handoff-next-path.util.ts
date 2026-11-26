import { AuthenticationService } from '../../../core/authentication/authentication.service';

export const normalizeOdooHandoffNextPath = (next: string | null | undefined): string => {
  const value = (next ?? '').trim();
  if (value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }

  return AuthenticationService.defaultRedirectUrl;
};
