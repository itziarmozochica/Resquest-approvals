import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  Signal,
  SimpleChanges,
  WritableSignal,
} from '@angular/core';

import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';

import { CART_DETAIL_SERVICE, CartDetailService } from '../../cart/services/cart-detail.service';
import { ChannelTranslatePipe } from '../../pipes/channel-translate/channel-translate.pipe';
import { CartDetailComponent } from '../cart-detail/cart-detail.component';

@Component({
  selector: 'cart-detail-obo',
  standalone: false,
  templateUrl: './cart-detail-obo.component.html',
  styleUrls: ['./cart-detail-obo.component.scss'],
  providers: [
    TitleCasePipe,
    ChannelTranslatePipe,
    {
      provide: CartDetailService,
      useFactory: () => inject(CART_DETAIL_SERVICE, { optional: true }) ?? new CartDetailService(),
    },
  ],
})
export class CartDetailOboComponent extends CartDetailComponent implements OnChanges {
  #changeDetectorRef = inject(ChangeDetectorRef);

  get couponFallbackCurrency(): string | null {
    if (!this.cart?.sessionItemsByDatetime) {
      return null;
    }

    for (const sessions of this.cart.sessionItemsByDatetime.values()) {
      const firstSession: CartSession | undefined = sessions[0];
      return firstSession?.price?.currency ?? null;
    }
    return null;
  }
  @Input() couponDiscount: Coupon | null = null;

  @Output() couponRemoved = new EventEmitter<void>();
  productSessions: WritableSignal<CartSession[]> = signal<CartSession[]>([]);
  ticketSessions: WritableSignal<CartSession[]> = signal<CartSession[]>([]);
  hasTitleSessions: Signal<boolean> = computed<boolean>(() => {
    return this.productSessions().length > 0 && this.ticketSessions().length > 0;
  });

  isEmptyCart(): boolean {
    return (this.cart?.getNumberOfTicketCounts() ?? 0) === 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    super.ngOnChanges(changes);
    if (changes.cart?.currentValue && changes.cart.currentValue !== changes.cart.previousValue) {
      const currentCart: Cart = changes.cart.currentValue;
      if (currentCart.sessionItemsByDatetime) {
        const newProductSessions: CartSession[] = [];
        const newTicketSessions: CartSession[] = [];
        currentCart.sessionItemsByDatetime.forEach(sessions => {
          sessions.forEach((session: CartSession) => {
            if (session.sessionType?.isShopProduct) {
              newProductSessions.push(session);
            } else {
              newTicketSessions.push(session);
            }
          });
        });
        this.productSessions.set(newProductSessions);
        this.ticketSessions.set(newTicketSessions);
        this.#changeDetectorRef.detectChanges();
      }
    }
  }

  removeCoupon(): void {
    this.couponDiscount = null;
    this.couponRemoved.emit();
  }
}
