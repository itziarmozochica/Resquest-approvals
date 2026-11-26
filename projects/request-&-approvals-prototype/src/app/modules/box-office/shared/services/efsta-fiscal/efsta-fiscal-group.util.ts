import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';

import { OnsiteSetup } from '../../models/onsite-setup';
import { EfstaFiscalGroupResolver, FiscalGroupsByMethodCode } from './models/efsta-fiscal-group.model';

/** The fiscal groups of the place's country by lowercased method code. `undefined` when the setup carries no map. */
export function readFiscalGroupsByMethodCode(onsiteSetup: OnsiteSetup | null): FiscalGroupsByMethodCode | undefined {
  const fiscalGroups = onsiteSetup?.fiscal_groups;
  if (fiscalGroups == null) {
    return undefined;
  }
  return new Map(Object.entries(fiscalGroups).map(([code, fiscalGroup]) => [code.toLowerCase(), fiscalGroup]));
}

/** The method's row, `card_split` looked up as `card`; `undefined` when the map has none. */
export function resolveTableFiscalGroup(
  paymentType: string | undefined,
  fiscalGroupsByMethodCode: FiscalGroupsByMethodCode,
): string | undefined {
  const code = paymentType?.toLowerCase();
  const lookupCode = code === PaymentType.CARD_SPLIT ? PaymentType.CARD : code;
  return lookupCode !== undefined ? (fiscalGroupsByMethodCode.get(lookupCode) ?? undefined) : undefined;
}

/** The resolver of the setup's fiscal group map; `undefined` when the setup carries no map. */
export function createTableFiscalGroupResolver(onsiteSetup: OnsiteSetup | null): EfstaFiscalGroupResolver | undefined {
  const fiscalGroupsByMethodCode = readFiscalGroupsByMethodCode(onsiteSetup);
  if (fiscalGroupsByMethodCode === undefined) {
    return undefined;
  }
  return paymentType => resolveTableFiscalGroup(paymentType, fiscalGroupsByMethodCode);
}
