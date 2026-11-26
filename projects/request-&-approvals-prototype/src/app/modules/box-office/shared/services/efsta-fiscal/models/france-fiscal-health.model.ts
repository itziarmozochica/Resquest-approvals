export type FranceFiscalHealthOutcome =
  | { readonly kind: 'healthy' }
  | { readonly kind: 'misconfigured'; readonly reason: string | null }
  | { readonly kind: 'serviceUnavailable'; readonly status: number }
  | { readonly kind: 'unexpected'; readonly status: number };

export interface FranceFiscalHealthErrorBody {
  readonly code?: string;
  readonly data?: { readonly reason?: string } | null;
  readonly error?: { readonly code?: string } | null;
}
