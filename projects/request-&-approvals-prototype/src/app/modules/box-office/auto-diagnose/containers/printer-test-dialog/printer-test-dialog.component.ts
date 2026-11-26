import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IGNT_DIALOG_DATA, IgntAlertComponent, IgntButtonComponent, IgntDialogCloseDirective, IgntDialogModule } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { PrinterResultView, PrinterTestKind, PrinterTestOutcome, PrinterTestResult } from '../../models/printer-diagnose.model';
import { PrinterTestDialogData, ReceiptTestPhase } from '../../models/printer-test-dialog.model';
import { AutoDiagnosePrinterService } from '../../services/auto-diagnose-printer.service';
import { AutoDiagnoseStateService } from '../../services/auto-diagnose-state.service';
import { toPrinterResultView } from '../../utils/printer-result.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntButtonComponent, IgntDialogCloseDirective, IgntDialogModule, IgntIconComponent, TranslateModule],
  selector: 'app-printer-test-dialog',
  styleUrl: './printer-test-dialog.component.scss',
  templateUrl: './printer-test-dialog.component.html',
})
export class PrinterTestDialogComponent {
  static readonly testCodePrefix = 'FZPRINT-';

  readonly #destroyRef = inject(DestroyRef);
  readonly #printerService = inject(AutoDiagnosePrinterService);
  readonly #stateService = inject(AutoDiagnoseStateService);
  readonly #translateService = inject(TranslateService);

  protected readonly data: PrinterTestDialogData = inject<PrinterTestDialogData>(IGNT_DIALOG_DATA);
  readonly #isPrintingTicket: WritableSignal<boolean> = signal<boolean>(false);
  readonly #receiptPhase: WritableSignal<ReceiptTestPhase> = signal<ReceiptTestPhase>(ReceiptTestPhase.idle);

  protected readonly isPrintingTicket: Signal<boolean> = this.#isPrintingTicket.asReadonly();
  protected readonly receiptPhase: Signal<ReceiptTestPhase> = this.#receiptPhase.asReadonly();
  protected readonly receiptTestPhase = ReceiptTestPhase;
  protected readonly receiptResult: Signal<PrinterResultView | null> = computed(() =>
    toPrinterResultView(this.#stateService.printerResults()[PrinterTestKind.receipt]),
  );
  protected readonly ticketResult: Signal<PrinterResultView | null> = computed(() =>
    toPrinterResultView(this.#stateService.printerResults()[PrinterTestKind.ticket]),
  );

  protected confirmReceipt(printed: boolean): void {
    this.#receiptPhase.set(ReceiptTestPhase.idle);
    this.#stateService.recordPrinterResult({
      at: Date.now(),
      kind: PrinterTestKind.receipt,
      outcome: printed ? PrinterTestOutcome.confirmedByUser : PrinterTestOutcome.notConfirmed,
      printerStatus: null,
    });
  }

  protected printReceipt(): void {
    this.#printerService.printTestReceipt({
      deviceName: this.data.deviceName,
      printedAt: new Date().toLocaleString(),
      qrContent: this.#testCode(),
      setupName: this.data.setupName,
      title: this.#translateService.instant('boxOffice.autoDiagnose.printer.dialog.testLabel'),
    });
    this.#receiptPhase.set(ReceiptTestPhase.awaitingConfirmation);
  }

  protected printTicket(): void {
    const ticketPrinter = this.data.ticketPrinter;

    if (ticketPrinter === null || this.isPrintingTicket()) {
      return;
    }

    this.#isPrintingTicket.set(true);
    this.#printerService
      .printTestTicket$(ticketPrinter, {
        lines: [this.data.setupName, this.data.deviceName, new Date().toLocaleString()],
        qrContent: this.#testCode(),
        title: this.#translateService.instant('boxOffice.autoDiagnose.printer.dialog.testLabel'),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: PrinterTestResult) => {
        this.#isPrintingTicket.set(false);
        this.#stateService.recordPrinterResult(result);
      });
  }

  #testCode(): string {
    return `${PrinterTestDialogComponent.testCodePrefix}${Date.now().toString(36).toUpperCase()}`;
  }
}
