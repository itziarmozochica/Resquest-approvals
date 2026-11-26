import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { QrGeneratorService } from '@fz-original/app/shared/services/qr-generator/qr-generator.service';
import {
  IgntAlertComponent,
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogModule,
  IgntProgressStepperComponent,
  IgntProgressStepperItem,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Code128BarcodeComponent } from '../../components/code128-barcode/code128-barcode.component';
import { ScannerBrandPickerComponent } from '../../components/scanner-brand-picker/scanner-brand-picker.component';
import { ScannerCheckListComponent } from '../../components/scanner-check-list/scanner-check-list.component';
import { ScannerFixGuideComponent } from '../../components/scanner-fix-guide/scanner-fix-guide.component';
import { DIAGNOSE_STATUS_PRESENTATION, DiagnoseStatus, DiagnoseStatusPresentation } from '../../models/auto-diagnose.model';
import {
  SCANNER_MAX_RESPONSE_MS,
  SCANNER_NO_SCAN_HINT_MS,
  SCANNER_SPEED_SCANS,
  SCANNER_STEP_SETTLE_MS,
  SCANNER_TEST_CODE_PREFIX,
  SCANNER_TEST_QR_SIZE_PX,
  SCANNER_TEST_STEPS,
  ScannerBrand,
  ScannerConnectionAdvice,
  ScannerDiagnosis,
  ScannerInputEvent,
  ScannerInputSource,
  ScannerStepRecord,
  ScannerTestStep,
} from '../../models/scanner-diagnose.model';
import { AutoDiagnoseScannerService } from '../../services/auto-diagnose-scanner.service';
import { AutoDiagnoseStateService } from '../../services/auto-diagnose-state.service';
import {
  diagnoseScanner,
  needsBroadcastFix,
  needsSuffixFix,
  toConnectionAdvice,
  toScannerStatus,
} from '../../utils/scanner-diagnosis.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Code128BarcodeComponent,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntDialogCloseDirective,
    IgntDialogModule,
    IgntIconComponent,
    IgntProgressStepperComponent,
    ScannerBrandPickerComponent,
    ScannerCheckListComponent,
    ScannerFixGuideComponent,
    TranslateModule,
  ],
  selector: 'app-scanner-test-dialog',
  styleUrl: './scanner-test-dialog.component.scss',
  templateUrl: './scanner-test-dialog.component.html',
})
export class ScannerTestDialogComponent {
  static readonly codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  static readonly codeLength = 6;
  static readonly stepKeyPrefix = 'boxOffice.autoDiagnose.scanner.dialog.steps.';

  readonly #destroyRef = inject(DestroyRef);
  readonly #qrGeneratorService = inject(QrGeneratorService);
  readonly #scannerService = inject(AutoDiagnoseScannerService);
  readonly #stateService = inject(AutoDiagnoseStateService);
  readonly #translateService = inject(TranslateService);

  readonly #completedRecords: WritableSignal<ScannerStepRecord[]> = signal<ScannerStepRecord[]>([]);
  readonly #currentEvents: WritableSignal<ScannerInputEvent[]> = signal<ScannerInputEvent[]>([]);
  readonly #diagnosis: WritableSignal<ScannerDiagnosis | null> = signal<ScannerDiagnosis | null>(null);
  readonly #qrDataUrl: WritableSignal<string | null> = signal<string | null>(null);
  readonly #isWaitingTooLong: WritableSignal<boolean> = signal<boolean>(false);
  readonly #isStalled: WritableSignal<boolean> = signal<boolean>(false);
  readonly #step: WritableSignal<ScannerTestStep> = signal<ScannerTestStep>(ScannerTestStep.brand);
  readonly #testCode: WritableSignal<string> = signal<string>(this.#newTestCode());
  #hintTimer: ReturnType<typeof setTimeout> | undefined;
  #keyboardTimer: ReturnType<typeof setTimeout> | undefined;
  #settleTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly brand: Signal<ScannerBrand | null> = this.#stateService.scannerBrand;
  protected readonly connectionAdvice: Signal<ScannerConnectionAdvice | null> = computed(() =>
    this.#isStalled() ? toConnectionAdvice(this.#stateService.scannerConnectionFailures()) : null,
  );
  protected readonly currentIndex: Signal<number> = computed(() => SCANNER_TEST_STEPS.indexOf(this.#step()));
  protected readonly diagnosis: Signal<ScannerDiagnosis | null> = this.#diagnosis.asReadonly();
  protected readonly isWaitingTooLong: Signal<boolean> = this.#isWaitingTooLong.asReadonly();
  protected readonly qrDataUrl: Signal<string | null> = this.#qrDataUrl.asReadonly();
  protected readonly receivedScans: Signal<number> = computed(
    () => this.#currentEvents().filter((event: ScannerInputEvent) => event.source === ScannerInputSource.broadcast).length,
  );
  protected readonly resultPresentation: Signal<DiagnoseStatusPresentation | null> = computed(() => {
    const diagnosis: ScannerDiagnosis | null = this.#diagnosis();

    return diagnosis === null ? null : DIAGNOSE_STATUS_PRESENTATION[toScannerStatus(diagnosis)];
  });
  protected readonly resultStatus: Signal<DiagnoseStatus | null> = computed(() => {
    const diagnosis: ScannerDiagnosis | null = this.#diagnosis();

    return diagnosis === null ? null : toScannerStatus(diagnosis);
  });
  protected readonly showBroadcastFix: Signal<boolean> = computed(() => {
    const diagnosis: ScannerDiagnosis | null = this.#diagnosis();

    return diagnosis !== null && needsBroadcastFix(diagnosis);
  });
  protected readonly showSuffixFix: Signal<boolean> = computed(() => {
    const diagnosis: ScannerDiagnosis | null = this.#diagnosis();

    return diagnosis !== null && needsSuffixFix(diagnosis);
  });
  protected readonly speedScans: number = SCANNER_SPEED_SCANS;
  protected readonly step: Signal<ScannerTestStep> = this.#step.asReadonly();
  protected readonly stepItems: Signal<IgntProgressStepperItem[]> = computed(() =>
    SCANNER_TEST_STEPS.map((step: ScannerTestStep) => ({
      id: step,
      label: this.#translateService.instant(`${ScannerTestDialogComponent.stepKeyPrefix}${step}`),
    })),
  );
  protected readonly testCode: Signal<string> = this.#testCode.asReadonly();
  protected readonly testStep = ScannerTestStep;
  protected readonly connectionAdviceType = ScannerConnectionAdvice;
  protected readonly statusType = DiagnoseStatus;

  constructor() {
    this.#scannerService
      .observeInput$()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((event: ScannerInputEvent) => this.#onInput(event));
    this.#destroyRef.onDestroy(() => this.#clearTimers());
    this.#renderQr();
  }

  protected continueToScan(): void {
    this.#startStep(ScannerTestStep.qr);
  }

  protected giveUp(): void {
    this.#clearTimers();
    this.#isStalled.set(true);
    this.#stateService.recordScannerStall(diagnoseScanner(this.#records()));
  }

  protected restart(): void {
    this.#completedRecords.set([]);
    this.#diagnosis.set(null);
    this.#testCode.set(this.#newTestCode());
    this.#renderQr();
    this.#startStep(ScannerTestStep.qr);
  }

  protected retryStep(): void {
    this.#startStep(this.#step());
  }

  protected selectBrand(brand: ScannerBrand): void {
    this.#stateService.selectScannerBrand(brand);
  }

  /** Counts the 10 s without input again, so a step that never gets all its scans still offers the way out. */
  #armHintTimer(): void {
    if (this.#settleTimer !== undefined) {
      return;
    }

    this.#hintTimer = setTimeout(() => this.#isWaitingTooLong.set(true), SCANNER_NO_SCAN_HINT_MS);
  }

  #clearTimers(): void {
    clearTimeout(this.#hintTimer);
    clearTimeout(this.#keyboardTimer);
    clearTimeout(this.#settleTimer);
    this.#hintTimer = undefined;
    this.#keyboardTimer = undefined;
    this.#settleTimer = undefined;
  }

  #completeStep(): void {
    this.#clearTimers();
    this.#completedRecords.update((records: ScannerStepRecord[]) => [...records, this.#currentRecord()]);

    const next: ScannerTestStep = SCANNER_TEST_STEPS[SCANNER_TEST_STEPS.indexOf(this.#step()) + 1];

    if (next === ScannerTestStep.done) {
      this.#finish(this.#completedRecords());

      return;
    }

    this.#startStep(next);
  }

  #currentRecord(): ScannerStepRecord {
    return { events: this.#currentEvents(), expected: this.#testCode(), step: this.#step() };
  }

  #finish(records: ScannerStepRecord[]): void {
    this.#clearTimers();
    const diagnosis: ScannerDiagnosis = diagnoseScanner(records);
    this.#diagnosis.set(diagnosis);
    this.#step.set(ScannerTestStep.done);
    this.#stateService.recordScannerDiagnosis(diagnosis);
  }

  #newTestCode(): string {
    const { codeAlphabet, codeLength } = ScannerTestDialogComponent;
    const random: Uint32Array = crypto.getRandomValues(new Uint32Array(codeLength));

    return `${SCANNER_TEST_CODE_PREFIX}${Array.from(random, (value: number) => codeAlphabet[value % codeAlphabet.length]).join('')}`;
  }

  #onInput(event: ScannerInputEvent): void {
    if (this.#step() === ScannerTestStep.brand || this.#step() === ScannerTestStep.done || this.#isStalled()) {
      return;
    }

    this.#currentEvents.update((events: ScannerInputEvent[]) => [...events, event]);
    this.#isWaitingTooLong.set(false);
    clearTimeout(this.#hintTimer);

    if (event.source === ScannerInputSource.keyboard) {
      this.#watchKeyboardOnly();
      this.#armHintTimer();

      return;
    }

    clearTimeout(this.#keyboardTimer);
    this.#keyboardTimer = undefined;

    const scansNeeded: number = this.#step() === ScannerTestStep.speed ? SCANNER_SPEED_SCANS : 1;

    if (this.receivedScans() >= scansNeeded && this.#settleTimer === undefined) {
      this.#settleTimer = setTimeout(() => this.#completeStep(), SCANNER_STEP_SETTLE_MS);

      return;
    }

    this.#armHintTimer();
  }

  #records(): ScannerStepRecord[] {
    return [...this.#completedRecords(), this.#currentRecord()];
  }

  #renderQr(): void {
    const code: string = this.#testCode();

    this.#qrDataUrl.set(null);
    this.#qrGeneratorService.generateQr(code, { width: SCANNER_TEST_QR_SIZE_PX }).then((dataUrl: string) => {
      if (this.#testCode() === code) {
        this.#qrDataUrl.set(dataUrl);
      }
    });
  }

  #startStep(step: ScannerTestStep): void {
    this.#clearTimers();
    this.#step.set(step);
    this.#currentEvents.set([]);
    this.#isStalled.set(false);
    this.#isWaitingTooLong.set(false);
    this.#armHintTimer();
  }

  /** Keystrokes with no broadcast behind them within the limit mean the scanner only types, it never broadcasts. */
  #watchKeyboardOnly(): void {
    if (this.#keyboardTimer !== undefined || this.receivedScans() > 0) {
      return;
    }

    this.#keyboardTimer = setTimeout(() => {
      if (this.receivedScans() === 0) {
        this.#finish(this.#records());
      }
    }, SCANNER_MAX_RESPONSE_MS);
  }
}
