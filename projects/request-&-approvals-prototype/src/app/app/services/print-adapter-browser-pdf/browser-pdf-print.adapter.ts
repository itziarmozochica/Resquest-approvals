import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { HardwareTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { saveAs } from 'file-saver';
import { concatMap, defer, from, Observable, of, toArray } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  PrintableRepresentation,
  PrintAdapterError,
  PrintRepresentationType,
  RenderedPrintable,
  UnsupportedPrintRepresentationError,
} from '../print-adapter/models/print-adapter.model';
import { PrintAdapter } from '../print-adapter/print.adapter';
import { PrintBlockedReason, PrintConfigurationBlockedReason } from '../print-v2/models/print-block.model';
import { BrowserPdfPrinterConfig, PrintCommand, PrintCommandPrinterType } from '../print-v2/models/print-command.model';

@Injectable({
  providedIn: 'root',
})
export class BrowserPdfPrintAdapter extends PrintAdapter {
  static readonly errorTitleKey = 'boxOffice.order.printDocument.title';
  static readonly popupsBlockedKey = 'boxOffice.order.printDocument.errors.popupsBlocked';

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #translateService = inject(TranslateService);

  print(documents: RenderedPrintable[], config: BrowserPdfPrinterConfig): Observable<void> {
    return from(documents).pipe(
      concatMap((document: RenderedPrintable) => this.#printDocument(document.representation, config)),
      toArray(),
      map((): void => undefined),
    );
  }

  validate(command: PrintCommand): PrintConfigurationBlockedReason | null {
    if (command.context.deviceHardwareType !== HardwareTypeEnum.dual_screen) {
      return null;
    }
    const isForced: boolean = command.printer.printerType === PrintCommandPrinterType.browser_pdf && command.printer.isForced;

    return isForced ? PrintBlockedReason.dual_screen_pdf_not_supported : PrintBlockedReason.dual_screen_without_printer;
  }

  #display(pdf: Blob, fileName: string): void {
    const targetWindow: Window | null = window.open(URL.createObjectURL(pdf), '_blank');
    if (targetWindow !== null) {
      return;
    }
    this.#datadogLogService.logWarn('[Printer][BrowserPdf] Print document pdf window blocked', {
      fileName,
      renderPath: 'backend_pdf',
    });
    this.#dialogService.openMessageModal(
      this.#translateService.instant(BrowserPdfPrintAdapter.errorTitleKey),
      this.#translateService.instant(BrowserPdfPrintAdapter.popupsBlockedKey),
    );
    throw new PrintAdapterError('Print document pdf window blocked by the browser', 'popup_blocked');
  }

  #printDocument(representation: PrintableRepresentation, config: BrowserPdfPrinterConfig): Observable<void> {
    return defer(() => {
      if (representation.type !== PrintRepresentationType.pdf) {
        throw new UnsupportedPrintRepresentationError(BrowserPdfPrintAdapter.name, representation.type);
      }
      if (config.shouldDownload) {
        saveAs(representation.pdf, representation.fileName);
      }
      this.#display(representation.pdf, representation.fileName);

      return of(undefined);
    });
  }
}
