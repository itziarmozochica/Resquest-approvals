import { IgntIconName } from '@ignite/icon';

export type TagIconGroupKey = 'activity' | 'foodDrink' | 'guests' | 'occasion' | 'onTheDay' | 'theme';

export interface TagIconGroup {
  readonly icons: readonly IgntIconName[];
  readonly key: TagIconGroupKey;
}
