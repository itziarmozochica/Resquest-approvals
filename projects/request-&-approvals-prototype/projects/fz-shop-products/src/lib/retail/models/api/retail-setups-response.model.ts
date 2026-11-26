import type { RetailSetupsApi } from './retail-setups-api.model';

export interface RetailSetupsResponse {
  data: RetailSetupsApi | null;
  error?: unknown;
}
