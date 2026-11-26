export enum UserSignupSource {
  FEVERZONE = 'feverzone',
  WHITELABEL = 'whitelabel',
  LANDING = 'landing',
  AMBASSADOR = 'ambassador',
  BACKOFFICE = 'backoffice',
}
export type UserSignupSourceValue = (typeof UserSignupSource)[keyof typeof UserSignupSource];
