import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IgntPillButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { SCANNER_BRANDS, ScannerBrand } from '../../models/scanner-diagnose.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntPillButtonComponent, TranslateModule],
  selector: 'app-scanner-brand-picker',
  styleUrl: './scanner-brand-picker.component.scss',
  templateUrl: './scanner-brand-picker.component.html',
})
export class ScannerBrandPickerComponent {
  readonly brand = input<ScannerBrand | null>(null);

  readonly brandChange = output<ScannerBrand>();

  protected readonly brands: readonly ScannerBrand[] = SCANNER_BRANDS;
}
