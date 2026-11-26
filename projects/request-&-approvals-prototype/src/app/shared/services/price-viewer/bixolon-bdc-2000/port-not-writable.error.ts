export class PortNotWritableError extends Error {
  constructor() {
    super('Port not writable');
  }
}
