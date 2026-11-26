import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-deposit-terms-checkbox',
  templateUrl: './deposit-terms-checkbox.component.html',
  styleUrls: ['./deposit-terms-checkbox.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntCheckboxComponent, NgIf, TranslateModule],
})
export class DepositTermsCheckboxComponent {
  get normalizedUrl(): string {
    if (!this.termsAndConditionsUrl) {
      return '#';
    }

    if (this.termsAndConditionsUrl.startsWith('http://') || this.termsAndConditionsUrl.startsWith('https://')) {
      return this.termsAndConditionsUrl;
    }

    return `https://${this.termsAndConditionsUrl}`;
  }
  @Input() agreeToTerms = false;
  @Output() agreeToTermsChange = new EventEmitter<boolean>();

  @Input() disabled = false;

  @Input() showError = false;

  @Input() termsAndConditionsUrl: string | null = null;

  onLinkClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  onTermsChange(value: boolean): void {
    this.agreeToTermsChange.emit(value);
  }
}
