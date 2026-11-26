export type OdooFnbSetupRequiredReason = 'link-error' | 'no-config' | 'pos-not-found';

export type OdooFnbHandOff = { kind: 'redirecting' } | { kind: 'setup-required'; reason: OdooFnbSetupRequiredReason };

export const ODOO_FNB_RESOLVE_KEY = 'redirect';
