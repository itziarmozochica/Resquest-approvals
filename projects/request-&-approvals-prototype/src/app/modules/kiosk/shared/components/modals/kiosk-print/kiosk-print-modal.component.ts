import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-kiosk-print-modal',
  standalone: false,
  templateUrl: './kiosk-print-modal.component.html',
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-print-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskPrintModalComponent {}
