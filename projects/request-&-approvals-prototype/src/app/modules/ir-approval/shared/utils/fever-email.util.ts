export const feverEmailDomain = '@example.com';

export function isFeverEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(feverEmailDomain);
}
