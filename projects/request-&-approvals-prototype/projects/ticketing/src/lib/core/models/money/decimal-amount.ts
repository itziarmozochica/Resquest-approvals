export type DecimalAmount = string;

const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u;
const LEADING_ZEROS = /^0+(?=\d)/u;
const TRAILING_ZEROS = /0+$/u;

function isDecimalAmount(amount: DecimalAmount): boolean {
  return typeof amount === 'string' && DECIMAL_PATTERN.test(amount.trim());
}

function assertDecimalAmount(amount: DecimalAmount, caller: string): void {
  if (!isDecimalAmount(amount)) {
    throw new TypeError(`${caller}: ${JSON.stringify(amount)} is not a decimal amount.`);
  }
}

export function isSameAmount(left: DecimalAmount, right: DecimalAmount): boolean {
  assertDecimalAmount(left, 'isSameAmount');
  assertDecimalAmount(right, 'isSameAmount');

  return normalizeAmount(left) === normalizeAmount(right);
}

export function normalizeAmount(amount: DecimalAmount): string {
  if (!isDecimalAmount(amount)) {
    return amount;
  }

  const trimmed = amount.trim();
  const signed = trimmed.startsWith('-') || trimmed.startsWith('+');
  const unsigned = signed ? trimmed.slice(1) : trimmed;
  const dot = unsigned.indexOf('.');

  const integer = (dot === -1 ? unsigned : unsigned.slice(0, dot)).replace(LEADING_ZEROS, '') || '0';
  const fraction = dot === -1 ? '' : unsigned.slice(dot + 1).replace(TRAILING_ZEROS, '');
  const magnitude = fraction === '' ? integer : `${integer}.${fraction}`;
  const sign = trimmed.startsWith('-') && magnitude !== '0' ? '-' : '';

  return `${sign}${magnitude}`;
}

export function addAmounts(left: DecimalAmount, right: DecimalAmount): DecimalAmount {
  assertDecimalAmount(left, 'addAmounts');
  assertDecimalAmount(right, 'addAmounts');

  const scale = Math.max(fractionDigits(left), fractionDigits(right));

  return fromMinorUnits(toMinorUnits(left, scale) + toMinorUnits(right, scale), scale);
}

export function subtractAmounts(left: DecimalAmount, right: DecimalAmount): DecimalAmount {
  assertDecimalAmount(left, 'subtractAmounts');
  assertDecimalAmount(right, 'subtractAmounts');

  const scale = Math.max(fractionDigits(left), fractionDigits(right));

  return fromMinorUnits(toMinorUnits(left, scale) - toMinorUnits(right, scale), scale);
}

export function multiplyAmount(amount: DecimalAmount, quantity: number): DecimalAmount {
  assertDecimalAmount(amount, 'multiplyAmount');

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new TypeError(`multiplyAmount: quantity must be a non-negative integer, received ${String(quantity)}`);
  }

  const scale = fractionDigits(amount);

  return fromMinorUnits(toMinorUnits(amount, scale) * BigInt(quantity), scale);
}

export function compareAmounts(left: DecimalAmount, right: DecimalAmount): number {
  assertDecimalAmount(left, 'compareAmounts');
  assertDecimalAmount(right, 'compareAmounts');

  const scale = Math.max(fractionDigits(left), fractionDigits(right));
  const leftMinor = toMinorUnits(left, scale);
  const rightMinor = toMinorUnits(right, scale);

  if (leftMinor === rightMinor) {
    return 0;
  }

  return leftMinor < rightMinor ? -1 : 1;
}

/** Every public entry point asserts its own operands first, so this never sees a non-amount. */
function toMinorUnits(amount: DecimalAmount, scale: number): bigint {
  const trimmed = amount.trim();
  const negative = trimmed.startsWith('-');
  const unsigned = negative || trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
  const dot = unsigned.indexOf('.');
  const integer = dot === -1 ? unsigned : unsigned.slice(0, dot);
  const fraction = dot === -1 ? '' : unsigned.slice(dot + 1);
  const magnitude = BigInt(`${integer === '' ? '0' : integer}${fraction.padEnd(scale, '0')}`);

  return negative ? -magnitude : magnitude;
}

function fromMinorUnits(minor: bigint, scale: number): DecimalAmount {
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(scale + 1, '0');
  const integer = digits.slice(0, digits.length - scale);
  const magnitude = scale === 0 ? integer : `${integer}.${digits.slice(digits.length - scale)}`;

  return negative ? `-${magnitude}` : magnitude;
}

function fractionDigits(amount: DecimalAmount): number {
  return amount.trim().split('.')[1]?.length ?? 0;
}
