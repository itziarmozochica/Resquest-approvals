import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ScannerCheckOutcome, ScannerCheckResult } from '../../models/scanner-diagnose.model';
import { ScannerCheckRow, toScannerCheckRows } from '../../utils/scanner-check-rows.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-scanner-check-list',
  styleUrl: './scanner-check-list.component.scss',
  templateUrl: './scanner-check-list.component.html',
})
export class ScannerCheckListComponent {
  readonly checks = input.required<ScannerCheckResult[]>();
  readonly compact = input<boolean>(false);

  protected readonly outcome = ScannerCheckOutcome;
  protected readonly rows: Signal<ScannerCheckRow[]> = computed(() => toScannerCheckRows(this.checks()));
}
