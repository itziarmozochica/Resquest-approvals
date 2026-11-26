import { CurrencyPipe, NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';

import { StripeKeys } from '@fz-original/environments/environment.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { IconsModule } from '../../icons/icons.module';
import { Coupon } from '../../models/cart/coupon.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconsModule, TranslateModule, NgTemplateOutlet, CurrencyPipe, NgIf],
  selector: 'app-coupon-cart-card',
  standalone: true,
  styleUrls: ['./coupon-cart-card.component.scss'],
  templateUrl: './coupon-cart-card.component.html',
})
export class CouponCartCardComponent implements OnInit {
  #translateService = inject(TranslateService);

  @Input({ required: true }) coupon!: Coupon;
  @Input() fallbackCurrency: keyof StripeKeys | string | null = null;
  locale = '';
  @Output() removeCoupon = new EventEmitter<undefined>();
  @Input() useMultiCartDesign = false;

  ngOnInit() {
    this.locale = this.#translateService.currentLang || '';
  }

  removeCouponClick() {
    this.removeCoupon.emit();
  }
}
