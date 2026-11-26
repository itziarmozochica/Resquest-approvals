export class NotPortSelectedError extends Error {
  constructor() {
    super('Not port selected on browser');
  }
}
