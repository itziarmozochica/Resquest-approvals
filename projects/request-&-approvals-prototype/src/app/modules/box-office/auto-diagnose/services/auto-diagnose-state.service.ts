import { inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { STORAGE_SERVICE } from '@fz/storage';

import { PrinterTestKind, PrinterTestResult } from '../models/printer-diagnose.model';
import { SCANNER_BRANDS, ScannerBrand, ScannerDiagnosis } from '../models/scanner-diagnose.model';
import { isScannerConnected } from '../utils/scanner-diagnosis.util';

/**
 * Results survive navigating away and back during the session; a reload starts over. The scanner brand is kept on the
 * till, so the next scanner test already knows it.
 */
@Injectable({ providedIn: 'root' })
export class AutoDiagnoseStateService {
  readonly #storage = inject(STORAGE_SERVICE);

  readonly #printerResults: WritableSignal<Partial<Record<PrinterTestKind, PrinterTestResult>>> = signal({});
  readonly #scannerBrand: WritableSignal<ScannerBrand | null> = signal<ScannerBrand | null>(this.#storedScannerBrand());
  readonly #scannerDiagnosis: WritableSignal<ScannerDiagnosis | null> = signal<ScannerDiagnosis | null>(null);
  readonly #scannerConnectionFailures: WritableSignal<number> = signal<number>(0);

  readonly printerResults: Signal<Partial<Record<PrinterTestKind, PrinterTestResult>>> = this.#printerResults.asReadonly();
  readonly scannerBrand: Signal<ScannerBrand | null> = this.#scannerBrand.asReadonly();
  readonly scannerConnectionFailures: Signal<number> = this.#scannerConnectionFailures.asReadonly();
  readonly scannerDiagnosis: Signal<ScannerDiagnosis | null> = this.#scannerDiagnosis.asReadonly();

  recordPrinterResult(result: PrinterTestResult): void {
    this.#printerResults.update((results: Partial<Record<PrinterTestKind, PrinterTestResult>>) => ({ ...results, [result.kind]: result }));
  }

  recordScannerDiagnosis(diagnosis: ScannerDiagnosis): void {
    this.#scannerDiagnosis.set(diagnosis);

    if (isScannerConnected(diagnosis)) {
      this.#scannerConnectionFailures.set(0);
    }
  }

  /** The user gave up waiting for a scan: keep the partial result and count one more failure, whatever arrived before. */
  recordScannerStall(diagnosis: ScannerDiagnosis): void {
    this.#scannerDiagnosis.set(diagnosis);
    this.#scannerConnectionFailures.update((failures: number) => failures + 1);
  }

  reset(): void {
    this.resetPrinterResults();
    this.#scannerDiagnosis.set(null);
    this.#scannerConnectionFailures.set(0);
  }

  resetPrinterResults(): void {
    this.#printerResults.set({});
  }

  selectScannerBrand(brand: ScannerBrand): void {
    this.#scannerBrand.set(brand);
    this.#storage.set(StorageKey.scannerBrand, brand);
  }

  #storedScannerBrand(): ScannerBrand | null {
    const stored: string | null = this.#storage.get(StorageKey.scannerBrand);

    return SCANNER_BRANDS.find((brand: ScannerBrand) => brand === stored) ?? null;
  }
}
