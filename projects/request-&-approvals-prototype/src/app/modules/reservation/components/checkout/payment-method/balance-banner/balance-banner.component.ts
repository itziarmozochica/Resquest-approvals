import { CurrencyPipe, NgIf, NgTemplateOutlet } from '@angular/common';
import { Component, Input } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Balance } from '../../../../../settings/shared/models/balance.model';

@Component({
  selector: 'app-balance-banner',
  templateUrl: './balance-banner.component.html',
  styleUrls: ['./balance-banner.component.scss'],
  standalone: true,
  imports: [TranslateModule, NgTemplateOutlet, CurrencyPipe, NgIf],
})
export class BalanceBannerComponent {
  @Input() balance!: Balance;
  locale: string;

  constructor(private translate: TranslateService) {
    this.locale = this.translate.currentLang;
  }
}
