export interface EfrPrinterState {
  readonly coverOpen: boolean | null;
  readonly dayOpen: boolean | null;
  readonly nextZRequired: string | null;
  readonly zi?: number | null;
  readonly paperEnd: boolean | null;
  readonly paperNearEnd: boolean | null;
  readonly printerWork: boolean | null;
  readonly warnings: readonly string[] | null;
}
