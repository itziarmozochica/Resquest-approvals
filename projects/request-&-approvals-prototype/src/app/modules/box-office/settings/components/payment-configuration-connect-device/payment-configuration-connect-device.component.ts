import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { IgntButtonComponent, IgntDialogService, IgntPillComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, take } from 'rxjs';

import { isSamePaymentTerminalId } from '../../../shared/constants/payment-terminal-patterns.constants';
import { AdyenLocalTerminalKeyStatus } from '../../../shared/models/adyen-local-device';
import { PaymentConfigurationTerminalInput } from '../../../shared/models/payment-configuration';
import { AdyenLocalDeviceBridgeService } from '../../../shared/services/adyen-local-device/adyen-local-device-bridge.service';
import { PaymentConfigurationConnectDeviceDialogComponent } from '../payment-configuration-connect-device-dialog/payment-configuration-connect-device-dialog.component';
import {
  PaymentConfigurationConnectDeviceDialogData,
  PaymentConfigurationConnectDeviceDialogResult,
  PaymentConfigurationConnectDeviceTarget,
} from '../payment-configuration-connect-device-dialog/payment-configuration-connect-device-dialog.model';

/**
 * Connecting the Box Office device to its Adyen local terminal (D17, D21, D22). Nobody types a
 * terminal id, it is read off the terminal certificate during the probe, and the whole flow needs
 * the native bridge, so it is only offered on a dual screen running an app that implements the
 * messages.
 *
 * Saving and connecting are one operation for the operator and two underneath: the key can only be
 * sealed against a configuration that exists, so the dialog saves first and says so.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntPillComponent, TranslateModule, UpperCasePipe],
  selector: 'app-payment-configuration-connect-device',
  styleUrl: './payment-configuration-connect-device.component.scss',
  templateUrl: './payment-configuration-connect-device.component.html',
})
export class PaymentConfigurationConnectDeviceComponent implements OnInit {
  readonly #bridgeService = inject(AdyenLocalDeviceBridgeService);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);

  readonly disabled = input<boolean>(false);
  /** False while the Adyen key block is incomplete: there would be nothing to seal. */
  readonly hasCredentials = input<boolean>(false);
  readonly terminals = input<readonly PaymentConfigurationTerminalInput[]>([]);
  /** Saves the payment configuration and answers where to connect. Supplied by the editor. */
  readonly saveBeforeConnect = input.required<() => Observable<PaymentConfigurationConnectDeviceTarget>>();

  readonly connected = output<PaymentConfigurationTerminalInput>();
  readonly removed = output<string>();

  /** Read once: the WebView writes `versionApp` before FeverZone loads and never changes it. */
  protected readonly supportsConnect: boolean = this.#bridgeService.supportsConnectDevice();

  protected readonly keyStatus = signal<AdyenLocalTerminalKeyStatus | null>(null);
  /** What a connect that succeeded here paired, before the parent's own row comes back down. */
  readonly #connectedHere = signal<PaymentConfigurationTerminalInput | null>(null);

  /**
   * The device answers with whatever NEXO key it holds, which may come from an earlier pairing under
   * another payment configuration. It counts as connected here only when that terminal is one of
   * this configuration's own.
   */
  protected readonly connectedTerminal = computed<PaymentConfigurationTerminalInput | null>(() => {
    const connectedHere = this.#connectedHere();
    if (connectedHere !== null) {
      return connectedHere;
    }
    const storedPoiId = this.keyStatus()?.poiId ?? null;
    if (storedPoiId === null) {
      return null;
    }
    return this.terminals().find(terminal => isSamePaymentTerminalId(terminal.externalId, storedPoiId)) ?? null;
  });
  protected readonly storedKeyVersion = computed<number | null>(() => this.keyStatus()?.keyVersion ?? null);
  protected readonly isConnected = computed<boolean>(() => this.connectedTerminal() !== null);

  /** A connect that just succeeded shows before the parent's own row makes it back down. */
  protected readonly displayedTerminals = computed<readonly PaymentConfigurationTerminalInput[]>(() => {
    const terminals = this.terminals();
    const connected = this.connectedTerminal();
    if (connected === null || terminals.some(terminal => isSamePaymentTerminalId(terminal.externalId, connected.externalId))) {
      return terminals;
    }
    return [...terminals, connected];
  });

  ngOnInit(): void {
    if (this.supportsConnect) {
      this.#loadTerminalKeyStatus();
    }
  }

  protected onRemove(externalId: string): void {
    const connectedHere = this.#connectedHere();
    if (connectedHere !== null && isSamePaymentTerminalId(connectedHere.externalId, externalId)) {
      this.#connectedHere.set(null);
    }
    this.removed.emit(externalId);
  }

  protected openConnectDialog(): void {
    if (this.disabled() || !this.hasCredentials()) {
      return;
    }
    const dialogRef = this.#dialogService.openModal<
      PaymentConfigurationConnectDeviceDialogResult | undefined,
      PaymentConfigurationConnectDeviceDialogData
    >(PaymentConfigurationConnectDeviceDialogComponent, {
      data: { ipAddress: this.connectedTerminal()?.ipAddress ?? '', saveBeforeConnect: this.saveBeforeConnect() },
      injector: this.#injector,
      size: 'sm',
    });

    dialogRef.closed$
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: PaymentConfigurationConnectDeviceDialogResult | undefined) => {
        if (result === undefined) {
          return;
        }
        this.keyStatus.set({
          keyIdentifier: null,
          keyVersion: result.keyVersion,
          poiId: result.terminal.externalId,
          stored: true,
        });
        this.#connectedHere.set(result.terminal);
        this.connected.emit(result.terminal);
      });
  }

  /**
   * Renders whether a device is already connected. A silent bridge here is not an operator error,
   * so the section degrades to "nothing connected" and the anomaly goes to Datadog instead.
   */
  #loadTerminalKeyStatus(): void {
    this.#bridgeService
      .terminalKeyStatus()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) =>
          this.#datadogLogService.logWarn('[ConnectDevice] The Box Office app did not report its stored terminal key', {
            error: JSON.stringify(error),
          }),
        next: keyStatus => this.keyStatus.set(keyStatus),
      });
  }
}
