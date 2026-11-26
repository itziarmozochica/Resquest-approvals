import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { TranslateModule } from '@ngx-translate/core';
import { BarcodeFormat } from '@zxing/library';
import { ZXingScannerModule } from '@zxing/ngx-scanner';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MultiSelectModule, TranslateModule, ZXingScannerModule],
  selector: 'app-scanner-view',
  styleUrl: './scanner-view.component.scss',
  templateUrl: './scanner-view.component.html',
})
export class ScannerViewComponent {
  readonly scanned = output<string>();

  protected readonly formatsEnabled: BarcodeFormat[] = [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE];

  readonly #availableDevices = signal<MediaDeviceInfo[]>([]);
  protected readonly deviceCurrent = signal<MediaDeviceInfo | null>(null);
  protected readonly enableQRScanner = signal(false);
  protected readonly showScanner = signal(true);
  protected readonly selectedDeviceOptions = signal<SelectOption[]>([]);

  protected readonly deviceOptions = computed<SelectOption[]>(() =>
    this.#availableDevices().map((availableDevice: MediaDeviceInfo) => ({
      id: availableDevice.deviceId,
      title: availableDevice.label,
    })),
  );

  protected onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.#availableDevices.set(devices);
    this.enableQRScanner.set(true);
  }

  protected onDeviceChange(device: MediaDeviceInfo | null): void {
    if (!device) {
      return;
    }
    this.#updateDevice(device);
  }

  protected onDeviceSelected(options: SelectOption[]): void {
    const deviceId = options[0]?.id;
    const device = this.#availableDevices().find(availableDevice => availableDevice.deviceId === deviceId);
    if (!device) {
      this.#syncSelectedDeviceOptions();

      return;
    }
    this.#updateDevice(device);
  }

  protected onScanResult(resultString: string): void {
    this.#stop();
    this.scanned.emit(resultString);
  }

  #stop(): void {
    this.enableQRScanner.set(false);
    this.showScanner.set(false);
    /**
     * Avoid `reset()` here because ZXing can throw asynchronously with
     * "No scanning is running at the time." during early teardown races.
     * Toggling the scanner inputs off is enough for safe cleanup.
     */
  }

  #syncSelectedDeviceOptions(): void {
    const device = this.deviceCurrent();
    this.selectedDeviceOptions.set(device ? [{ id: device.deviceId, title: device.label }] : []);
  }

  #updateDevice(device: MediaDeviceInfo): void {
    if (this.deviceCurrent()?.deviceId === device.deviceId) {
      return;
    }
    this.deviceCurrent.set(device);
    this.#syncSelectedDeviceOptions();
  }
}
