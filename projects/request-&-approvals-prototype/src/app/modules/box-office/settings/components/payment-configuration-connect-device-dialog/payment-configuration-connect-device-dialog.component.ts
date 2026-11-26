import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { switchMap } from 'rxjs';

import { isValidPaymentTerminalIpAddress } from '../../../shared/constants/payment-terminal-patterns.constants';
import {
  ADYEN_LOCAL_CONNECT_DEVICE_FAILURES,
  AdyenLocalConnectDeviceFailure,
  isAdyenLocalConnectDeviceError,
} from '../../../shared/services/adyen-local-device/adyen-local-connect-device.error';
import { AdyenLocalDeviceConnectionService } from '../../../shared/services/adyen-local-device/adyen-local-device-connection.service';
import {
  PaymentConfigurationConnectDeviceDialogData,
  PaymentConfigurationConnectDeviceDialogResult,
} from './payment-configuration-connect-device-dialog.model';

type ConnectDialogStatus = 'idle' | 'saving' | 'connecting' | 'failed';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IgntButtonComponent, IgntDialogModule, IgntFieldErrorComponent, IgntInputFieldComponent, TranslateModule],
  selector: 'app-payment-configuration-connect-device-dialog',
  styleUrl: './payment-configuration-connect-device-dialog.component.scss',
  templateUrl: './payment-configuration-connect-device-dialog.component.html',
})
export class PaymentConfigurationConnectDeviceDialogComponent {
  readonly #connectionService = inject(AdyenLocalDeviceConnectionService);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #data = inject<PaymentConfigurationConnectDeviceDialogData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<PaymentConfigurationConnectDeviceDialogResult | undefined>>(IGNT_DIALOG_REF);

  protected readonly ipAddress = signal<string>(this.#data.ipAddress);
  protected readonly status = signal<ConnectDialogStatus>('idle');
  protected readonly failure = signal<AdyenLocalConnectDeviceFailure | null>(null);

  /** The configuration is already persisted once the save is through, and the operator has to know. */
  protected readonly savedWithoutConnecting = signal<boolean>(false);

  protected readonly busy = computed<boolean>(() => this.status() === 'saving' || this.status() === 'connecting');
  protected readonly failureMessageKey = computed<string | null>(() => {
    const failure = this.failure();
    return failure === null ? null : ADYEN_LOCAL_CONNECT_DEVICE_FAILURES[failure].messageKey;
  });

  protected cancel(): void {
    if (this.busy()) {
      return;
    }
    this.#dialogRef.close(undefined);
  }

  protected onIpAddressChange(value: string): void {
    this.ipAddress.set(value);
    if (this.status() === 'failed') {
      this.status.set('idle');
      this.failure.set(null);
    }
  }

  protected submit(): void {
    if (this.busy()) {
      return;
    }
    const ipAddress = this.ipAddress().trim();
    if (!isValidPaymentTerminalIpAddress(ipAddress)) {
      this.#fail('terminal_ip_invalid');
      return;
    }

    this.failure.set(null);
    this.status.set('saving');

    this.#data
      .saveBeforeConnect()
      .pipe(
        switchMap(target => {
          this.savedWithoutConnecting.set(true);
          this.status.set('connecting');
          return this.#connectionService.connect(target.configurationId, ipAddress);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (error: unknown) => this.#fail(this.#failureOf(error), error),
        next: connected =>
          this.#dialogRef.close({
            keyVersion: connected.storedKey.keyVersion,
            terminal: { externalId: connected.terminal.poiId, ipAddress: connected.ipAddress },
          }),
      });
  }

  #fail(failure: AdyenLocalConnectDeviceFailure, cause?: unknown): void {
    this.failure.set(failure);
    this.status.set('failed');
    this.#datadogLogService.logError('[ConnectDevice] Saving and connecting the Box Office device failed', {
      error: cause === undefined ? null : JSON.stringify(cause),
      failure,
      saved: this.savedWithoutConnecting(),
    });
  }

  /** A save that never reached the device is its own failure: nothing was connected and nothing was lost. */
  #failureOf(error: unknown): AdyenLocalConnectDeviceFailure {
    if (this.status() === 'saving') {
      this.savedWithoutConnecting.set(false);
      return 'save_failed';
    }
    return isAdyenLocalConnectDeviceError(error) ? error.failure : 'unexpected';
  }
}
