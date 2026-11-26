import type { RetailSetupsResponse } from '../models/api/retail-setups-response.model';
import type { RetailSetup } from '../models/retail-setup/retail-setup.model';
import { adaptRetailSetupApi } from './adapt-retail-setup-api';

export function adaptRetailSetupsResponse(body: RetailSetupsResponse): RetailSetup[] {
  const map = body.data;
  if (map === null) {
    return [];
  }
  return Object.entries(map).map(([id, entry]) => adaptRetailSetupApi(id, entry));
}
