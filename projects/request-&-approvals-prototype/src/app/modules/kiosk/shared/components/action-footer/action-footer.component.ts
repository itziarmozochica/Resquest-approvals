import { Component, EventEmitter, Input, Output } from '@angular/core';

import { KioskButtonComponent } from '../button/kiosk-button.component';

@Component({
  imports: [KioskButtonComponent],
  selector: 'app-action-footer',
  templateUrl: './action-footer.component.html',
  styleUrls: ['./action-footer.component.scss'],
})
export class ActionFooterComponent {
  @Input() disablePrimary = false;
  @Input() disableSecondary = false;
  @Output() primaryButtonClick = new EventEmitter<void>();
  @Input() primaryButtonText?: string;
  @Input() primaryFill = false;
  @Output() secondaryButtonClick = new EventEmitter<void>();
  @Input() secondaryButtonText?: string;
  @Input() secondaryFill = false;

  onPrimaryClick(): void {
    if (!this.disablePrimary) {
      this.primaryButtonClick.emit();
    }
  }

  onSecondaryClick(): void {
    if (!this.disableSecondary) {
      this.secondaryButtonClick.emit();
    }
  }
}
