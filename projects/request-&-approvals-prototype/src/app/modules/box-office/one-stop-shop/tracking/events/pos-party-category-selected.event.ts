import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosPartyCategorySelectedData {
  category: string;
}

export const posPartyCategorySelected = defineEvent<PosPartyCategorySelectedData>('pos.party.category.selected');
