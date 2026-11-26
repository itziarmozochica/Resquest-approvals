export class CantOpenPortConnectionError extends Error {
  constructor(message: string) {
    super(`Can't open port connection due to: ${message}`);
  }
}
