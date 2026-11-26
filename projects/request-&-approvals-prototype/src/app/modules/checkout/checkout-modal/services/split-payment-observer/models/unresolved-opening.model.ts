export type UnresolvedOpeningSource = 'pay_in_full' | 'split_legs';

export interface UnresolvedOpening {
  source: UnresolvedOpeningSource;
  amount?: number;
  gateway?: string;
  method?: string;
}
