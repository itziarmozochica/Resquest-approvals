export enum TemplateCouponKind {
  percentage = 'percentage',
  money = 'money',
  bundle = 'bundle',
}

export type TemplateCouponKindET = keyof typeof TemplateCouponKind;

export enum TemplateCouponStatus {
  inProgress = 'in_progress',
  updating = 'updating',
  active = 'active',
  inactive = 'inactive',
  deleted = 'deleted',
}

export interface TemplateCoupon {
  id: number;
  title: string;
  kind: TemplateCouponKindET;
  code: string;
  discountQuantity: number;
  currencyIdentifier: string;
  currentUsages: number;
  totalAvailableUsages: number | null;
  currentConsumptions: number;
  totalAvailableConsumptions: number | null;
  status: TemplateCouponStatus;
  isActive: boolean;
  startDate: Date | null;
  expirationDate: Date;
}
