import { CommonModule, getCurrencySymbol } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';

import { SeatingModalComponent } from '@fz-original/app/shared/components/seating-modal/seating-modal.component';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { CartUtil } from '@fz-original/app/shared/utils/cart.util';
import { fixedDecimals } from '@fz-original/app/shared/utils/number.util';
import { IgntTooltipDirective } from '@ignite/common';
import { IgntIconComponent, type IgntIconName, type IgntIconVariant } from '@ignite/icon';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';

import { PlanDiscountType } from '../../../memberships/models/memberships.model';

@Component({
  imports: [CommonModule, TranslateModule, PipesModule, IgntFieldErrorComponent, IgntIconComponent, IgntTooltipDirective],
  selector: 'app-one-step-multi-cart-detail-sessions',
  standalone: true,
  styleUrls: ['./one-step-multi-cart-detail-sessions.component.scss'],
  templateUrl: './one-step-multi-cart-detail-sessions.component.html',
})
export class OneStepMultiCartDetailSessionsComponent implements OnInit {
  #modalService: NgbModal = inject(NgbModal);
  #translateService: TranslateService = inject(TranslateService);

  @Input() label = '';
  @Input() labelIconName: IgntIconName = 'ticket-alt';
  @Input() labelIconVariant: IgntIconVariant = 'light';
  @Input() cartSessions: CartSession[] = [];
  @Input() enableColapse = true;
  @Input() planHasMultipleVenues = false;
  @Input() venueName = '';

  collapsed = false;
  locale = '';
  hasSeating = false;

  get partySizeWarnings(): string[] {
    return CartUtil.getPartySizeWarnings(this.cartSessions, this.#translateService);
  }

  ngOnInit() {
    this.locale = this.#translateService.currentLang || '';
    this.hasSeating = this.cartSessions.some(session => session.seats?.length ?? 0 > 0);
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  trackByCartSessionId(_: number, cartSession: CartSession): number {
    return cartSession.sessionId;
  }

  openSeatingModal(): void {
    const sessions: CartSession[] = this.cartSessions;
    if (sessions.length > 0) {
      const modal: NgbModalRef = this.#modalService.open(SeatingModalComponent, { size: 'lg' });
      modal.componentInstance.sessionsSeats = sessions.map((session: CartSession) => {
        const { units, sessionName } = session;
        const seats: string[] | null | undefined = this.getSeatLabels(session);
        return { units, sessionName, seats };
      });
      modal.componentInstance.closeEmitter.pipe(take(1)).subscribe(() => modal.close());
    }
  }

  hasDiscountCartSession(cartSession: CartSession): boolean {
    return !!cartSession.autoAppliedPlanDiscountsInfo && cartSession.autoAppliedPlanDiscountsInfo.discount > 0;
  }

  getCartSessionTotalPrice(cartSession: CartSession): Money | null {
    if (this.hasDiscountCartSession(cartSession)) {
      return new Money((cartSession.unitPrice?.amount ?? 0) * cartSession.units, cartSession.unitPrice?.currency ?? '');
    }
    return cartSession.price ?? null;
  }

  getTotalDiscountByCartSession(cartSession: CartSession): Money {
    const currency = cartSession.unitPrice?.currency ?? '';
    if (!cartSession.autoAppliedPlanDiscountsInfo) {
      return new Money(0, currency);
    }

    const priceWithDiscount = cartSession.autoAppliedPlanDiscountsInfo.unitPriceWithDiscount.amount;
    const priceWithoutDiscount = cartSession.autoAppliedPlanDiscountsInfo.unitPriceWithoutDiscount.amount;
    const totalDiscount = fixedDecimals(Math.max(0, (priceWithoutDiscount - priceWithDiscount) * cartSession.units), 2);

    return new Money(totalDiscount, currency);
  }

  showTooltipText(cartSession: CartSession): string {
    const autoAppliedPlanDiscountsInfo = cartSession?.autoAppliedPlanDiscountsInfo;
    if (!autoAppliedPlanDiscountsInfo) {
      return '';
    }

    const discountPercentageTranslationKey = this.#translateService.instant(
      'sessions.pricing.priceList.priceEditForm.strikethroughPrice.discountTagText',
    );
    const discountAmountTranslationKey = this.#translateService.instant('boxOffice.memberships.discounts.labelAmount');

    switch (autoAppliedPlanDiscountsInfo.discountType) {
      case PlanDiscountType.PERCENTAGE:
        return `${autoAppliedPlanDiscountsInfo.discount}% ${discountPercentageTranslationKey}`;
      case PlanDiscountType.AMOUNT: {
        const currency = cartSession.unitPrice?.currency ?? '';
        const currencySymbol = currency ? getCurrencySymbol(currency, 'narrow', this.locale) : '';
        return `${autoAppliedPlanDiscountsInfo.discount}${currencySymbol} ${discountAmountTranslationKey}`;
      }
    }
  }

  protected getSeatLabels(cartSession: CartSession) {
    return CartUtil.getSessionSeatLabelsForUi(cartSession);
  }

  getSessionName(cartSession: CartSession): string | undefined {
    return cartSession.sessionType?.isShopProduct ? cartSession.sessionNameWithoutFormat : cartSession.sessionName;
  }
}
