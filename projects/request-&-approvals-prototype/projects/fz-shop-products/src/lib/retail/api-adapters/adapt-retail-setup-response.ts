import { assertIsDefined } from '@fz/utils/assert-is-defined';

import type { RetailSetupResponse } from '../models/api/retail-setup-response.model';
import type { RetailSetup } from '../models/retail-setup/retail-setup.model';
import { adaptRetailSetupApi } from './adapt-retail-setup-api';

export function adaptRetailSetupResponse(body: RetailSetupResponse, retailSetupId: string): RetailSetup {
  assertIsDefined(body.data);
  return adaptRetailSetupApi(retailSetupId, body.data);
}
