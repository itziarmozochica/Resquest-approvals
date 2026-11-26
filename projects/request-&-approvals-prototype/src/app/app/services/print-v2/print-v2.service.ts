import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { HardwareTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PrintDocumentRenderError } from '@fz-original/app/shared/services/ticket-pdf-generator/errors/print-document-render.error';
import { TranslateService } from '@ngx-translate/core';
import { catchError, concatMap, defer, from, map, Observable, of, switchMap, tap, throwError, toArray } from 'rxjs';

import {
  PrintableRepresentation,
  PrintAdapterError,
  PrintPdfRequestedError,
  RenderedPrintable,
} from '../print-adapter/models/print-adapter.model';
import { PrintAdapter } from '../print-adapter/print.adapter';
import { closingProgress, PrintDialogService } from '../print-dialog/print-dialog.service';
import { PrintRenderer } from '../print-renderer/print.renderer';
import { PrintBlock, PrintBlockedReason, PrintConfigurationBlockedReason, PrintDeviceHardwareType } from './models/print-block.model';
import {
  PrintableObject,
  PrintCommand,
  PrintCommandBuildError,
  PrintCommandBuildResult,
  printCommandDefaultLocale,
  PrintCommandPrinterType,
  PrintRenderAbandonedError,
  PrintV2Outcome,
} from './models/print-command.model';
import { PrintAdapterResolverService } from './print-adapter-resolver.service';
import { PrintCommandBuilderService, PrintJob } from './print-command-builder.service';
import { PrintPlanLocaleService } from './print-plan-locale.service';
import { PrintRendererResolverService } from './print-renderer-resolver.service';

@Injectable({
  providedIn: 'root',
})
export class PrintV2Service {
  static readonly errorTitleKey = 'boxOffice.order.printDocument.title';
  static readonly printerNotSupportedKey = 'boxOffice.order.printDocument.errors.printerNotSupported';
  static readonly renderFailedKey = 'boxOffice.order.printDocument.errors.renderFailed';

  static readonly messageKeysByApiCode: Readonly<Record<string, string>> = {
    NO_PRINT_DOCUMENTS: 'boxOffice.order.printDocument.errors.noDocuments',
    PERMISSION_DENIED: 'boxOffice.order.printDocument.errors.permissionDenied',
    PRINT_CONFIGURATION_NOT_RESOLVED: 'boxOffice.order.printDocument.errors.noPrintConfiguration',
    PRINT_DOCUMENT_LIMIT_EXCEEDED: 'boxOffice.order.printDocument.errors.tooManyDocuments',
  };

  static readonly blockedReasonsByBuildError: Readonly<Record<PrintCommandBuildError, PrintConfigurationBlockedReason>> = {
    [PrintCommandBuildError.no_partner]: PrintBlockedReason.no_partner,
    [PrintCommandBuildError.no_printable_orders]: PrintBlockedReason.no_printable_orders,
  };

  static readonly blockedMessageKeysByReason: Readonly<Record<PrintConfigurationBlockedReason, string>> = {
    [PrintBlockedReason.dual_screen_app_outdated]: 'boxOffice.order.printDocument.errors.dualScreenAppOutdated',
    [PrintBlockedReason.dual_screen_pdf_not_supported]: 'boxOffice.order.printDocument.errors.dualScreenPdfNotSupported',
    [PrintBlockedReason.dual_screen_without_printer]: 'boxOffice.order.printDocument.errors.dualScreenWithoutPrinter',
    [PrintBlockedReason.no_partner]: 'boxOffice.order.printDocument.errors.noPartner',
    [PrintBlockedReason.no_printable_orders]: 'boxOffice.order.printDocument.errors.noDocuments',
  };

  static readonly hardwareMismatchKeysByDevice: Readonly<Record<PrintDeviceHardwareType, string>> = {
    [HardwareTypeEnum.desktop]: 'boxOffice.order.printDocument.errors.hardwareMismatch.desktop',
    [HardwareTypeEnum.dual_screen]: 'boxOffice.order.printDocument.errors.hardwareMismatch.dualScreen',
  };

  readonly #datadogLogService = inject(DatadogLogService);
  readonly #partnerService = inject(PartnerService);
  readonly #printAdapterResolverService = inject(PrintAdapterResolverService);
  readonly #printCommandBuilderService = inject(PrintCommandBuilderService);
  readonly #printDialogService = inject(PrintDialogService);
  readonly #printPlanLocaleService = inject(PrintPlanLocaleService);
  readonly #printRendererResolverService = inject(PrintRendererResolverService);
  readonly #translateService = inject(TranslateService);

  print(job: PrintJob): Observable<PrintV2Outcome> {
    return defer(() => this.#resolveLocale$(job)).pipe(
      switchMap((locale: string) => {
        const result: PrintCommandBuildResult = this.#printCommandBuilderService.build(job, locale);
        if ('error' in result) {
          return this.#onBlocked(this.#getJobPayload(job), { reason: PrintV2Service.blockedReasonsByBuildError[result.error] });
        }

        const { command } = result;
        const adapter: PrintAdapter | null = this.#printAdapterResolverService.resolve(
          command.printer.printerType,
          command.context.deviceHardwareType,
        );
        const renderer: PrintRenderer | null = this.#printRendererResolverService.resolve(command.printer.printerType);
        if (adapter === null || renderer === null) {
          return this.#onPrinterNotSupported(command);
        }

        const block: PrintBlock | null = this.#checkHardware(command) ?? this.#toBlock(adapter.validate(command));
        if (block !== null) {
          return this.#onBlocked(this.#getCommandPayload(command), block);
        }

        return this.#print$(command, adapter, renderer);
      }),
    );
  }

  #checkHardware(command: PrintCommand): PrintBlock | null {
    const { deviceHardwareType, setupHardwareType } = command.context;
    if (deviceHardwareType === null || setupHardwareType === HardwareTypeEnum.unknown || deviceHardwareType === setupHardwareType) {
      return null;
    }

    return { deviceHardwareType, reason: PrintBlockedReason.hardware_mismatch, setupHardwareType };
  }

  #getBlockedMessageKey(block: PrintBlock): string {
    return block.reason === PrintBlockedReason.hardware_mismatch
      ? PrintV2Service.hardwareMismatchKeysByDevice[block.deviceHardwareType]
      : PrintV2Service.blockedMessageKeysByReason[block.reason];
  }

  #getCommandPayload(command: PrintCommand): Record<string, unknown> {
    return {
      deviceHardwareType: command.context.deviceHardwareType,
      onsiteSetupId: command.context.onsiteSetupId,
      orderCount: command.printables.length,
      orderIds: command.printables.map((printable: PrintableObject) => printable.order.id),
      printerType: command.printer.printerType,
      setupHardwareType: command.context.setupHardwareType,
    };
  }

  #getJobPayload(job: PrintJob): Record<string, unknown> {
    const printerType: PrintCommandPrinterType = this.#printCommandBuilderService.resolvePrinterType(job);

    return {
      orderCount: job.orders.length,
      orderIds: job.orders.map((order: Order) => order.id),
      printerType,
    };
  }

  #getMessageKey(error: unknown): string {
    const apiCode: string | undefined = error instanceof PrintDocumentRenderError ? error.apiCode : undefined;

    return (apiCode !== undefined ? PrintV2Service.messageKeysByApiCode[apiCode] : undefined) ?? PrintV2Service.renderFailedKey;
  }

  #getRenderErrorPayload(error: unknown): Record<string, unknown> {
    return {
      apiCode: error instanceof PrintDocumentRenderError ? error.apiCode : undefined,
      reason: this.#getRenderFailureReason(error),
      status: error instanceof PrintDocumentRenderError ? error.status : undefined,
    };
  }

  #getRenderFailureReason(error: unknown): string {
    if (error instanceof PrintDocumentRenderError) {
      return error.reason;
    }

    return error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'unknown';
  }

  #onBlocked(payload: Record<string, unknown>, block: PrintBlock): Observable<PrintV2Outcome> {
    this.#datadogLogService.logError('[Printer][V2] Print blocked', { ...payload, reason: block.reason });
    this.#printDialogService.showMessage(
      this.#translateService.instant(PrintV2Service.errorTitleKey),
      this.#translateService.instant(this.#getBlockedMessageKey(block)),
    );

    return of(PrintV2Outcome.blocked);
  }

  #onPdfRequested(command: PrintCommand, error: PrintPdfRequestedError): void {
    this.#datadogLogService.logInfo('[Printer][V2] Print document pdf requested', {
      ...this.#getCommandPayload(command),
      printerStatus: error.printerStatus,
    });
  }

  #onPrinted(command: PrintCommand): void {
    this.#datadogLogService.logInfo('[Printer][V2] Print document printed', this.#getCommandPayload(command));
  }

  #onPrinterNotSupported(command: PrintCommand): Observable<PrintV2Outcome> {
    this.#datadogLogService.logError('[Printer][V2] Print job not supported by the revamped pipeline', this.#getCommandPayload(command));
    this.#printDialogService.showMessage(
      this.#translateService.instant(PrintV2Service.errorTitleKey),
      this.#translateService.instant(PrintV2Service.printerNotSupportedKey),
    );

    return of(PrintV2Outcome.printed_failure);
  }

  #onPrintFailed(command: PrintCommand, error: unknown): void {
    const failurePayload: Record<string, unknown> =
      error instanceof PrintAdapterError
        ? { printerStatus: error.printerStatus, reason: error.reason }
        : this.#getRenderErrorPayload(error instanceof PrintRenderAbandonedError ? error.renderError : error);
    this.#datadogLogService.logError('[Printer][V2] Print document print failed', {
      ...this.#getCommandPayload(command),
      ...failurePayload,
    });

    if (!(error instanceof PrintAdapterError) && !(error instanceof PrintRenderAbandonedError)) {
      this.#printDialogService.showMessage(
        this.#translateService.instant(PrintV2Service.errorTitleKey),
        this.#translateService.instant(this.#getMessageKey(error)),
      );
    }
  }

  #onRenderFailed(command: PrintCommand, error: unknown, attempt: number): void {
    this.#datadogLogService.logError('[Printer][V2] Print document render failed', {
      ...this.#getCommandPayload(command),
      ...this.#getRenderErrorPayload(error),
      attempt,
      isRetry: attempt > 1,
    });
  }

  #print$(command: PrintCommand, adapter: PrintAdapter, renderer: PrintRenderer): Observable<PrintV2Outcome> {
    return this.#renderWithRetry$(command, renderer, 1).pipe(
      switchMap((documents: RenderedPrintable[]) => adapter.print(documents, command.printer)),
      toArray(),
      tap(() => this.#onPrinted(command)),
      map((): PrintV2Outcome => PrintV2Outcome.printed_success),
      catchError((error: unknown) => {
        if (error instanceof PrintPdfRequestedError) {
          this.#onPdfRequested(command, error);
          return of(PrintV2Outcome.pdf_requested);
        }
        this.#onPrintFailed(command, error);
        return of(PrintV2Outcome.printed_failure);
      }),
    );
  }

  #renderWithRetry$(command: PrintCommand, renderer: PrintRenderer, attempt: number): Observable<RenderedPrintable[]> {
    return defer(() => {
      const progress = this.#printDialogService.openProgress(command.printables.length);

      return from(command.printables).pipe(
        concatMap((printable: PrintableObject, index: number) => {
          progress.update(index + 1);
          return renderer
            .render$(command, printable)
            .pipe(map((representation: PrintableRepresentation): RenderedPrintable => ({ printable, representation })));
        }),
        toArray(),
        closingProgress(progress),
      );
    }).pipe(
      catchError((error: unknown) => {
        this.#onRenderFailed(command, error, attempt);
        return this.#printDialogService
          .confirmRetry(
            this.#translateService.instant(PrintV2Service.errorTitleKey),
            this.#translateService.instant(this.#getMessageKey(error)),
          )
          .pipe(
            switchMap((shouldRetry: boolean) =>
              shouldRetry ? this.#renderWithRetry$(command, renderer, attempt + 1) : throwError(() => new PrintRenderAbandonedError(error)),
            ),
          );
      }),
    );
  }

  #resolveLocale$(job: PrintJob): Observable<string> {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      return of(printCommandDefaultLocale);
    }
    const planId: number | undefined = this.#printCommandBuilderService.getPrintableOrders(job.orders)[0]?.planId;

    return this.#printPlanLocaleService.resolve$(partnerId, planId);
  }

  #toBlock(reason: PrintConfigurationBlockedReason | null): PrintBlock | null {
    return reason === null ? null : { reason };
  }
}
