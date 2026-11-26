import type { RetailSetupsApi } from '../models/api/retail-setups-api.model';
import type { RetailSetup } from '../models/retail-setup/retail-setup.model';
import { adaptRetailSetupApi } from './adapt-retail-setup-api';

export function adaptRetailSetupRecord(data: RetailSetupsApi | null | undefined): RetailSetup | null {
  if (data === null || data === undefined || Object.keys(data).length === 0) {
    return null;
  }
  const firstEntry = Object.entries(data)[0];
  const [id, record] = firstEntry;
  return adaptRetailSetupApi(id, record);
}
