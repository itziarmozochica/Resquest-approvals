import { PaymentConfigurationGatewayProvider } from '../models/payment-configuration';

export interface PaymentTerminalFormat {
  readonly digits: number;
  readonly prefix: string;
}

// `adyen_local` is deliberately absent: its terminal is created by the connect-device flow from the
// id read off the terminal certificate (D21), so no one ever types one into the editor.
export type PaymentTerminalProvider = Extract<PaymentConfigurationGatewayProvider, 'adyen' | 'payhere'>;

const ADYEN_TERMINAL_PATTERN = '^(S1F2-[0-9]{15}|V240mPlus-[0-9]{9}|P400Plus-[0-9]{9}|P630-[0-9]{9})$';

// Must stay in sync with ADYEN_TERMINAL_PATTERN; JS regex has no partial-match API, so the
// prefix-viability check needs the format broken into literal prefix + digit count.
const ADYEN_TERMINAL_FORMATS: readonly PaymentTerminalFormat[] = [
  { digits: 15, prefix: 'S1F2-' },
  { digits: 9, prefix: 'V240mPlus-' },
  { digits: 9, prefix: 'P400Plus-' },
  { digits: 9, prefix: 'P630-' },
];

// The backend validator is the source of truth for terminal ids; these only stop typos at setup.
export const PAYMENT_TERMINAL_PATTERNS: Record<PaymentTerminalProvider, string> = {
  adyen: ADYEN_TERMINAL_PATTERN,
  payhere: '^EK[0-9]{8}$',
};

export const PAYMENT_TERMINAL_FORMATS: Record<PaymentTerminalProvider, readonly PaymentTerminalFormat[]> = {
  adyen: ADYEN_TERMINAL_FORMATS,
  payhere: [{ digits: 8, prefix: 'EK' }],
};

const IPV4_OCTET = '(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])';
const IPV4_PATTERN = new RegExp(`^${IPV4_OCTET}(\\.${IPV4_OCTET}){3}$`);

export function supportsPaymentTerminals(provider: PaymentConfigurationGatewayProvider | null): provider is PaymentTerminalProvider {
  return provider !== null && provider in PAYMENT_TERMINAL_PATTERNS;
}

/** Shape check only, and it lives here because connecting a device is the one place that asks. */
/** Terminal ids travel in whatever case the certificate carries; partners stores them normalised. */
export function isSamePaymentTerminalId(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export function isValidPaymentTerminalIpAddress(value: string): boolean {
  return IPV4_PATTERN.test(value);
}

export function isViablePaymentTerminalPrefix(value: string, formats: readonly PaymentTerminalFormat[]): boolean {
  return formats.some(({ digits, prefix }) => {
    if (prefix.startsWith(value)) {
      return true;
    }
    const rest = value.slice(prefix.length);
    return value.startsWith(prefix) && rest.length <= digits && /^[0-9]*$/.test(rest);
  });
}
