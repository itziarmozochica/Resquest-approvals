import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosSearchFunctionData {
  resultCount: number;
  searchQuery: string;
}

export const posSearchFunction = defineEvent<PosSearchFunctionData>('pos.search.function');
