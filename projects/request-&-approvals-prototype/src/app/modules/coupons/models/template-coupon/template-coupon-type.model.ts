export enum TemplateCouponType {
  default = 'default',
  unique = 'unique',
}

export type TemplateCouponTypeET = keyof typeof TemplateCouponType;
