import type { RetailSetupApi } from './retail-setup-api.model';

export interface RetailSetupResponse {
  data: RetailSetupApi | null;
  error?: unknown;
}
