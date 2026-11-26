import { Component, inject, Input, Signal } from '@angular/core';

import { KioskLanguageService } from '../../../services/kiosk-language.service';
import { Money } from './../../../../../shared/models/money.model';

@Component({
  selector: 'app-kiosk-cart-item',
  standalone: false,
  templateUrl: './cart-item.component.html',
  styleUrls: ['./cart-item.component.scss'],
})
export class CartItemComponent {
  readonly #kioskLanguageService = inject(KioskLanguageService);
  @Input() amount = 0;
  @Input() feePricePerTicket: Money | null = null;
  locale: Signal<string> = this.#kioskLanguageService.locale;
  @Input() ticketTypeName = '';
  @Input() ticketTypePrice: Money | null = null;
  @Input() ticketTypePriceStrikethrough: Money | null = null;
  @Input() totalSurchagePrice: Money | null = null;
}
