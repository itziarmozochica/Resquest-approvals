import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  inject,
  Injector,
  Signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { EntryPointClient } from '@fz-original/app/app/enums/entry-point-client.enum';
import { DualScreenData } from '@fz-original/app/app/models/dual-screen-data.model';
import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { PageTitleModule } from '@fz-original/app/shared/layout/page-title/page-title.module';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { EntryPointClientService } from '@fz-original/app/shared/services/entry-point-client/entry-point-client.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FztOnsiteSetupModalComponent, type FztOnsiteSetupModalData, type FztOnsiteSetupModalResult } from '@fz/ticketing-ui';
import { IgntAlertComponent, IgntButtonComponent, IgntDialogService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { filter, fromEvent, map, Observable, startWith, take } from 'rxjs';

import { DiagnoseTileComponent } from '../../components/diagnose-tile/diagnose-tile.component';
import { ScannerCheckListComponent } from '../../components/scanner-check-list/scanner-check-list.component';
import { DiagnoseStatus, DiagnoseTileAction, DiagnoseTileDetail } from '../../models/auto-diagnose.model';
import { PrinterTestKind, PrinterTestResult, TicketPrinterSetup } from '../../models/printer-diagnose.model';
import { PrinterTestDialogData } from '../../models/printer-test-dialog.model';
import { ScannerDiagnosis } from '../../models/scanner-diagnose.model';
import { AutoDiagnoseStateService } from '../../services/auto-diagnose-state.service';
import { toDeviceDetail, toDeviceFlagDetail } from '../../utils/device-detail.util';
import { ONSITE_SETUP_SETTINGS_ROUTE, toOnsiteSetupSettingsQueryParams } from '../../utils/onsite-setup-settings-link.util';
import { toPrinterStatus } from '../../utils/printer-result.util';
import { hasReceiptPrinter, toPrinterDetails, toTicketPrinterSetup } from '../../utils/printer-setup.util';
import { toScannerStatus } from '../../utils/scanner-diagnosis.util';
import { isWebViewOutdated, MIN_WEBVIEW_MAJOR_VERSION, toWebViewVersion } from '../../utils/webview-version.util';
import { PrinterTestDialogComponent } from '../printer-test-dialog/printer-test-dialog.component';
import { ScannerTestDialogComponent } from '../scanner-test-dialog/scanner-test-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DiagnoseTileComponent,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntIconComponent,
    PageTitleModule,
    ScannerCheckListComponent,
    TranslateModule,
  ],
  selector: 'app-auto-diagnose',
  styleUrl: './auto-diagnose.component.scss',
  templateUrl: './auto-diagnose.component.html',
})
export class AutoDiagnoseComponent {
  static readonly keyPrefix = 'boxOffice.autoDiagnose.';
  static readonly manageOnsiteSetupsPermission = 'can_manage_onsite_setups';
  static readonly printerAction: DiagnoseTileAction = { icon: 'print', labelKey: 'boxOffice.autoDiagnose.printer.test' };
  static readonly scannerAction: DiagnoseTileAction = { icon: 'qrcode', labelKey: 'boxOffice.autoDiagnose.scanner.test' };

  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #document = inject(DOCUMENT);
  readonly #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #entryPointClientService = inject(EntryPointClientService);
  readonly #injector = inject(Injector);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #partnerService = inject(PartnerService);
  readonly #router = inject(Router);
  readonly #stateService = inject(AutoDiagnoseStateService);
  readonly #userService = inject(UserService);

  readonly #dualScreenData: DualScreenData | null = this.#dualScreenStorageService.getData();
  readonly #isMobile = this.#breakpointStateService.getStateProp('isMobile');
  readonly #isTablet = this.#breakpointStateService.getStateProp('isTablet');
  readonly #onsiteSetup: Signal<OnsiteSetup | null> = toSignal(this.#observeOnsiteSetup$(), {
    initialValue: this.#onsiteSetupsStorageService.getConfiguration(),
  });
  readonly #ticketPrinter: Signal<TicketPrinterSetup | null> = computed(() =>
    toTicketPrinterSetup(this.#onsiteSetup(), this.#dualScreenData?.versionApp ?? null),
  );
  readonly #hasReceiptPrinter: Signal<boolean> = computed(() => hasReceiptPrinter(this.#onsiteSetup()));

  readonly #webViewVersion: string | null = toWebViewVersion(this.#document.defaultView?.navigator.userAgent ?? '');

  protected readonly deviceDetails: DiagnoseTileDetail[] = this.#toDeviceDetails();
  protected readonly isWebViewOutdated: boolean = isWebViewOutdated(this.#webViewVersion);
  protected readonly deviceStatus: DiagnoseStatus =
    this.#dualScreenData === null || this.isWebViewOutdated ? DiagnoseStatus.warning : DiagnoseStatus.ok;
  protected readonly deviceSummaryKey: string = this.#toDeviceSummaryKey();
  protected readonly webViewParams: Record<string, string> = {
    min: String(MIN_WEBVIEW_MAJOR_VERSION),
    version: this.#webViewVersion ?? '',
  };
  protected readonly canOpenSetupSettings: boolean = this.#userService.hasPermission(AutoDiagnoseComponent.manageOnsiteSetupsPermission);
  protected readonly onsiteSetupName: Signal<string | null> = computed(() => this.#onsiteSetup()?.name ?? null);
  /** Opened from Odoo, a chosen setup belongs to the Odoo till, so only a missing one can be selected here. */
  protected readonly showSetupSelectorButton: Signal<boolean> = computed(
    () => this.onsiteSetupName() === null || this.#entryPointClientService.entryPointClient() !== EntryPointClient.Odoo,
  );
  protected readonly printerAction: DiagnoseTileAction = AutoDiagnoseComponent.printerAction;
  protected readonly printerDetails: Signal<DiagnoseTileDetail[]> = computed(() => {
    const setup: OnsiteSetup | null = this.#onsiteSetup();

    return setup === null ? [] : toPrinterDetails(setup);
  });
  protected readonly printerStatus: Signal<DiagnoseStatus> = computed(() => {
    if (this.#onsiteSetup() === null || (this.#ticketPrinter() === null && !this.#hasReceiptPrinter())) {
      return DiagnoseStatus.blocked;
    }

    return toPrinterStatus(this.#relevantPrinterResults());
  });
  protected readonly printerSummaryKey: Signal<string> = computed(() => {
    if (this.#onsiteSetup() === null) {
      return `${AutoDiagnoseComponent.keyPrefix}printer.summary.noSetup`;
    }
    if (this.printerStatus() === DiagnoseStatus.blocked) {
      return `${AutoDiagnoseComponent.keyPrefix}printer.summary.noPrinter`;
    }

    return `${AutoDiagnoseComponent.keyPrefix}printer.summary.${this.printerStatus()}`;
  });
  protected readonly scannerAction: DiagnoseTileAction = AutoDiagnoseComponent.scannerAction;
  protected readonly scannerDiagnosis: Signal<ScannerDiagnosis | null> = this.#stateService.scannerDiagnosis;
  protected readonly scannerStatus: Signal<DiagnoseStatus> = computed(() => toScannerStatus(this.#stateService.scannerDiagnosis()));
  protected readonly scannerSummaryKey: Signal<string> = computed(
    () => `${AutoDiagnoseComponent.keyPrefix}scanner.summary.${this.scannerStatus()}`,
  );
  protected readonly statusType = DiagnoseStatus;

  constructor() {
    afterNextRender(
      () => {
        if (this.#onsiteSetup() === null) {
          this.openSetupSelector();
        }
      },
      { injector: this.#injector },
    );
  }

  protected openPrinterTest(): void {
    const data: PrinterTestDialogData = {
      deviceName: this.#dualScreenData?.deviceName ?? '',
      hasReceiptPrinter: this.#hasReceiptPrinter(),
      setupName: this.onsiteSetupName() ?? '',
      ticketPrinter: this.#ticketPrinter(),
    };

    this.#dialogService.openModal<void, PrinterTestDialogData>(PrinterTestDialogComponent, { data, injector: this.#injector, size: 'md' });
  }

  protected openScannerTest(): void {
    this.#dialogService.openModal<void>(ScannerTestDialogComponent, { injector: this.#injector, size: 'md' });
  }

  protected openSetupSelector(): void {
    const partnerId: number | null = this.#partnerService.getActingOrganizationId();

    if (partnerId === null) {
      return;
    }

    const data: FztOnsiteSetupModalData = {
      hasActiveShiftAndActiveOnsiteSetup: false,
      hasCloseButton: true,
      isMobileOrTablet: this.#isMobile() || this.#isTablet(),
      partnerId: String(partnerId),
      preselectedOnsiteSetupId: this.#onsiteSetup()?.id,
      userName: this.#userService.getUser()?.name ?? null,
    };

    this.#dialogService
      .openModal<FztOnsiteSetupModalResult, FztOnsiteSetupModalData>(FztOnsiteSetupModalComponent, {
        data,
        disableCloseShortcuts: false,
        injector: this.#injector,
        size: 'md',
      })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((selection: FztOnsiteSetupModalResult | undefined) => {
        if (selection !== undefined) {
          this.#stateService.resetPrinterResults();
        }
      });
  }

  protected openSetupSettings(): void {
    const setup: OnsiteSetup | null = this.#onsiteSetup();

    if (setup === null) {
      return;
    }

    void this.#router.navigate(ONSITE_SETUP_SETTINGS_ROUTE, { queryParams: toOnsiteSetupSettingsQueryParams(setup) });
  }

  protected resetResults(): void {
    this.#stateService.reset();
  }

  #observeOnsiteSetup$(): Observable<OnsiteSetup | null> {
    const storageKey: string = this.#onsiteSetupsStorageService.ONSITE_SETUP_CONFIG;

    return fromEvent<StorageEvent>(this.#document.defaultView ?? this.#document, 'storage').pipe(
      filter((event: StorageEvent) => event.key === storageKey),
      map(() => this.#onsiteSetupsStorageService.getConfiguration()),
      startWith(this.#onsiteSetupsStorageService.getConfiguration()),
    );
  }

  #relevantPrinterResults(): PrinterTestResult[] {
    const results = this.#stateService.printerResults();

    return [
      this.#ticketPrinter() === null ? undefined : results[PrinterTestKind.ticket],
      this.#hasReceiptPrinter() ? results[PrinterTestKind.receipt] : undefined,
    ].filter((result: PrinterTestResult | undefined): result is PrinterTestResult => result !== undefined);
  }

  #toDeviceDetails(): DiagnoseTileDetail[] {
    const { keyPrefix } = AutoDiagnoseComponent;
    const data: DualScreenData | null = this.#dualScreenData;

    return [
      toDeviceDetail(`${keyPrefix}device.name`, data?.deviceName),
      toDeviceDetail(`${keyPrefix}device.serial`, data?.serial),
      toDeviceDetail(`${keyPrefix}device.appVersion`, data?.versionApp),
      toDeviceDetail(`${keyPrefix}device.androidId`, data?.androidId),
      toDeviceFlagDetail(`${keyPrefix}device.nfc`, data?.hasNFC),
      toDeviceDetail(`${keyPrefix}device.webView`, this.#webViewVersion ?? undefined),
    ];
  }

  #toDeviceSummaryKey(): string {
    const prefix = `${AutoDiagnoseComponent.keyPrefix}device.summary.`;

    if (this.#dualScreenData === null) {
      return `${prefix}warning`;
    }

    return this.isWebViewOutdated ? `${prefix}outdatedWebView` : `${prefix}ok`;
  }
}
