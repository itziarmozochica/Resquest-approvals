import { HttpErrorResponse } from '@angular/common/http';

import { readErrorCode } from './read-error-code.util';

const NOT_FOUND_STATUS = 404;
const TAB_NOT_FOUND_CODE = 'TAB_NOT_FOUND';
const CREATE_ORDER_TABS_ERRORS_I18N = 'boxOffice.order.posTabs.createErrors';

const CREATE_ORDER_TABS_ERROR_KEYS: ReadonlyMap<string, string> = new Map([
  ['ENTITLEMENT_CONFIG_NOT_FOUND', `${CREATE_ORDER_TABS_ERRORS_I18N}.entitlementConfigNotFound`],
  ['ORDER_TABS_CHANGED_CONCURRENTLY', `${CREATE_ORDER_TABS_ERRORS_I18N}.orderTabsChangedConcurrently`],
  ['ORDER_WITHOUT_SHOPS_ENTITLEMENTS', `${CREATE_ORDER_TABS_ERRORS_I18N}.orderWithoutShopsEntitlements`],
  ['POINT_OF_SALE_NOT_FOUND', `${CREATE_ORDER_TABS_ERRORS_I18N}.pointOfSaleNotFound`],
  ['TAB_NOT_SYNCABLE_YET', `${CREATE_ORDER_TABS_ERRORS_I18N}.tabNotSyncableYet`],
  ['TAB_NOT_FOUND', `${CREATE_ORDER_TABS_ERRORS_I18N}.orderWithoutShopsEntitlements`],
  ['TAB_SYNC_FAILED', `${CREATE_ORDER_TABS_ERRORS_I18N}.tabSyncFailed`],
  ['TAB_SYNC_REFUSED', `${CREATE_ORDER_TABS_ERRORS_I18N}.tabSyncRefused`],
]);

export const CREATE_ORDER_TABS_GENERIC_ERROR_KEY = `${CREATE_ORDER_TABS_ERRORS_I18N}.generic`;

export function isOrderWithoutTabsError(error: unknown): boolean {
  if (error instanceof HttpErrorResponse && error.status === NOT_FOUND_STATUS) {
    return true;
  }

  return readErrorCode(error) === TAB_NOT_FOUND_CODE;
}

export function getCreateOrderTabsErrorKey(error: unknown): string {
  const code = readErrorCode(error);

  return (code !== null ? CREATE_ORDER_TABS_ERROR_KEYS.get(code) : undefined) ?? CREATE_ORDER_TABS_GENERIC_ERROR_KEY;
}
