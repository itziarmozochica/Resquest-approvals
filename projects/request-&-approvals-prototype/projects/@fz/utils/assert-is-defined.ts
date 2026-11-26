export function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === undefined) {
    throw new Error('Expected value to be defined: current value is "undefined"');
  }
  if (value === null) {
    throw new Error('Expected value to be defined: current value is "null"');
  }
}
