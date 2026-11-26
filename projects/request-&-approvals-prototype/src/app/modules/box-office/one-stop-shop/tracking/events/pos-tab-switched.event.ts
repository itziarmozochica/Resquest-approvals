import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosTabSwitchedData {
  fromTab: string;
  toTab: string;
}

export const posTabSwitched = defineEvent<PosTabSwitchedData>('pos.tab.switched');
