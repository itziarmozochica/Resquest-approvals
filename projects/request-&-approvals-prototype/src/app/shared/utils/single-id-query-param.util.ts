import { Params, Router } from '@angular/router';

/**
 * Reads a query param that stands for exactly one id.
 *
 * The dashboard entry points send the plural `planIds`/`cityIds` the 360 filters read, so anything
 * that used to look at the singular form alone has to accept both. A multi-select value (`1,2`)
 * describes no single id and resolves to `undefined`, which is what keeps a multi-event selection
 * from being mistaken for one event.
 */
export function parseSingleIdParam(value: unknown): number | undefined {
  if (value == null || value === '' || `${value}`.includes(',')) {
    return undefined;
  }
  const id = Number(value);
  return Number.isFinite(id) ? id : undefined;
}

/**
 * Whether a query param holds several ids, which is the other half of the rule above: the value
 * `parseSingleIdParam` resolves to `undefined` for because it names more than one thing, as opposed
 * to the one it resolves to `undefined` for because it names nothing at all.
 *
 * Both cases look identical to a caller reading the parsed id, and they do not mean the same: an
 * absent param states nothing, while a multi-select one states that no single id applies.
 */
export function isMultiIdParam(value: unknown): boolean {
  return value != null && `${value}`.includes(',');
}

/**
 * The `forcedPartnerId` a link carries, read off the in-flight navigation because `canMatch` runs
 * during route recognition and receives no snapshot.
 *
 * `null` and the parsed id are different answers and callers act on both: a link with no
 * `forcedPartnerId` names no partner and the guards wait for the selected one as before, while a
 * link carrying an unusable value (`abc`, `1,2`) names one they cannot resolve — waiting there is
 * the hang this exists to avoid, so they match instead and let `HasForcedPartnerGuard` clean the
 * param up during activation.
 */
export function readForcedPartnerId(router: Router): { id: number | undefined; present: boolean } {
  const navigation = router.getCurrentNavigation();
  const queryParams: Params = navigation?.extractedUrl?.queryParams ?? navigation?.initialUrl?.queryParams ?? {};
  const raw: unknown = queryParams['forcedPartnerId'];

  return { id: parseSingleIdParam(raw), present: raw != null && raw !== '' };
}
