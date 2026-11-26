export class ExtendedError {
  message: string | null = null;
  status = false;

  constructor() {
    this.clear();
  }

  clear(): void {
    this.status = false;
    this.message = null;
  }
}
