export interface PaymentMethodDisplay {
  isImageTintable: boolean;
  imageUrl: string | null;
  label: string;
}

const tintableIconPath = '/images/payment-methods/presets/';

// TODO(B2BO-9455): ad hoc list until we decide whether "logo only" belongs to the catalog or the onsite setup
const logoOnlyPaymentMethodCodes: readonly string[] = ['ancv', 'ancv_cheque'];

export interface PaymentMethodDisplaySource {
  code: string;
  iconUrl?: string | null;
  name?: string | null;
}

export function resolvePaymentMethodLabel(name: string | null | undefined, code: string, translation: string | null = null): string {
  const trimmed = name?.trim() ?? '';
  if (trimmed.length > 0) {
    return trimmed;
  }
  return translation ?? titleCasePaymentMethodCode(code);
}

export function resolvePaymentMethodDisplay(method: PaymentMethodDisplaySource): PaymentMethodDisplay {
  const imageUrl = method.iconUrl ?? null;
  return { isImageTintable: isTintablePaymentMethodIcon(imageUrl), imageUrl, label: resolvePaymentMethodLabel(method.name, method.code) };
}

export function isLogoOnlyPaymentMethod(code: string): boolean {
  return logoOnlyPaymentMethodCodes.includes(code);
}

export function isTintablePaymentMethodIcon(url: string | null): boolean {
  return url !== null && url.includes(tintableIconPath);
}

function titleCasePaymentMethodCode(code: string): string {
  return code
    .split(/[_\s]+/)
    .filter((part: string) => part.length > 0)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
