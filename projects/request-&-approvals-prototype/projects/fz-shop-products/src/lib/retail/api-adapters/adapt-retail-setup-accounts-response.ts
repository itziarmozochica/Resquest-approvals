import type { RetailSetupAccountsResponse } from '../models/api/retail-setup-account-api.model';
import type { RetailSetupAccount } from '../models/retail-setup/retail-setup-account.model';

export function adaptRetailSetupAccountsResponse(body: RetailSetupAccountsResponse): RetailSetupAccount[] {
  if (body.data === null) {
    return [];
  }
  return body.data.map(account => ({
    id: account.id,
    label: account.label,
  }));
}
