import { ChangeDetectionStrategy, Component, computed, input, output, Signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import {
  SCANNER_BROADCAST_STEPS,
  SCANNER_RESET_COMMANDS,
  SCANNER_SUFFIX_COMMANDS,
  ScannerBrand,
  ScannerProgrammingCode,
} from '../../models/scanner-diagnose.model';
import { Code128BarcodeComponent } from '../code128-barcode/code128-barcode.component';
import { ScannerBrandPickerComponent } from '../scanner-brand-picker/scanner-brand-picker.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Code128BarcodeComponent, IgntIconComponent, ScannerBrandPickerComponent, TranslateModule],
  selector: 'app-scanner-fix-guide',
  styleUrl: './scanner-fix-guide.component.scss',
  templateUrl: './scanner-fix-guide.component.html',
})
export class ScannerFixGuideComponent {
  readonly brand = input<ScannerBrand | null>(null);
  readonly showBroadcastSteps = input<boolean>(false);
  readonly showResetSteps = input<boolean>(false);
  readonly showSuffixBarcode = input<boolean>(false);

  readonly brandChange = output<ScannerBrand>();

  protected readonly broadcastSteps: readonly string[] = SCANNER_BROADCAST_STEPS;
  protected readonly needsBrand: Signal<boolean> = computed(() => this.showResetSteps() || this.showSuffixBarcode());
  protected readonly resetCommand: Signal<ScannerProgrammingCode | null> = computed(() => {
    const brand: ScannerBrand | null = this.brand();

    return brand === null ? null : (SCANNER_RESET_COMMANDS[brand] ?? null);
  });
  protected readonly suffixCommand: Signal<ScannerProgrammingCode | null> = computed(() => {
    const brand: ScannerBrand | null = this.brand();

    return brand === null ? null : (SCANNER_SUFFIX_COMMANDS[brand] ?? null);
  });
}
