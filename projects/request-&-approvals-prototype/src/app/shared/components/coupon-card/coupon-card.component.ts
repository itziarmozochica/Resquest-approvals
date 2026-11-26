import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, input, Output } from '@angular/core';

import { CouponCardEvent } from '@fz-original/app/shared/components/coupon-card/coupon-card-event';

@Component({
  selector: 'app-coupon-card',
  standalone: true,
  templateUrl: './coupon-card.component.html',
  styleUrls: ['./coupon-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf],
})
export class CouponCardComponent {
  @Output() cardClick = new EventEmitter<CouponCardEvent>();
  @Input() code: string | null = null;
  @Input() isLazy = false;
  title = input.required<string>();
}
