import { assertIsDefined } from '@fz/utils/assert-is-defined';

import type { GenerateLinkResponse } from '../models/generate-link.api';
import type { OdooPointOfSaleLink } from '../models/odoo-point-of-sale-link.model';

export function adaptGenerateLinkResponse(response: GenerateLinkResponse): OdooPointOfSaleLink {
  const data = response.data;
  assertIsDefined(data);

  return {
    accountId: data.account_id,
    link: data.link,
  };
}
