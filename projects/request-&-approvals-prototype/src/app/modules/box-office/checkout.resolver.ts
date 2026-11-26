import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

import { MessageModalComponent } from '../../shared/components/message-modal/message-modal.component';
import { SpinnerService } from '../../shared/layout/spinner/spinner.service';
import { Cart } from '../../shared/models/cart/cart.model';
import { Partner } from '../../shared/models/partner/partner.model';
import { Plan } from '../../shared/models/plan/plan.model';
import { CartService } from '../../shared/services/cart/cart.service';
import { FiscalComplianceBlockModalService } from '../../shared/services/fiscal-compliance-block/fiscal-compliance-block-modal.service';
import { PartnerService } from '../../shared/services/partner/partner.service';
import { PlanService } from '../../shared/services/plan/plan.service';
import { Channel } from '../../shared/services/session-availability/channel.enum';
import { OnsiteSetupRequiredApiErrorService } from './shared/services/onsite-setup-required-api-error.service';
import { OnsiteSetupsStorageService } from './shared/services/onsite-setups/onsite-setups-storage.service';

export interface CheckoutData {
  isInOverrideZone: boolean;
  cart: Cart;
  plan: Plan;
  reservationId: string | null;
  rescheduleOrderId: number | null;
  userId?: number;
}

@Injectable()
export class CheckoutResolver {
  readonly #fiscalComplianceBlockModalService = inject(FiscalComplianceBlockModalService);
  private isInOverrideZone = false;
  private plan!: Plan;
  private partner!: Partner;
  private rescheduleOrderId: number | null = null;
  constructor(
    private cartService: CartService,
    private partnerService: PartnerService,
    private router: Router,
    private planService: PlanService,
    private modalService: NgbModal,
    private translate: TranslateService,
    private spinnerService: SpinnerService,
    private onsiteSetupRequiredApiErrorService: OnsiteSetupRequiredApiErrorService,
    private onsiteSetupsStorageService: OnsiteSetupsStorageService,
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<CheckoutData> {
    const navigation = this.router.getCurrentNavigation();
    const cartId = route.paramMap.get('cartId');
    const reservationId = route.paramMap.get('reservationId') || null;
    const onsiteSetupId = navigation?.extras?.state?.onsiteSetupId;
    this.partner = this.partnerService.getPartner()!;
    const rescheduleOrderIdParam = route.queryParamMap.get('rescheduleOrderId');
    this.rescheduleOrderId =
      navigation?.extras?.state?.rescheduleOrderId || (rescheduleOrderIdParam ? parseInt(rescheduleOrderIdParam) : null);
    this.isInOverrideZone = navigation?.extras?.state?.isInOverrideZone === true;

    if (navigation?.extras?.state) {
      const passedCart: Cart = Object.assign(new Cart(), navigation.extras.state.cart);
      const passedUserId: number | undefined = navigation.extras.state.userId;
      const isCartValid: boolean = passedCart && passedCart.id === cartId && !!passedCart.preparedAt;
      if (isCartValid && !!navigation.extras.state.plan) {
        this.plan = Object.assign(new Plan(), navigation.extras.state.plan);
        if (reservationId && onsiteSetupId) {
          return this.prepareCart(passedCart, this.plan, reservationId, onsiteSetupId);
        }
        if (reservationId) {
          return this.prepareCart(passedCart, this.plan, reservationId);
        }
        return of({
          isInOverrideZone: this.isInOverrideZone,
          cart: passedCart,
          plan: this.plan,
          reservationId,
          rescheduleOrderId: this.rescheduleOrderId,
          userId: passedUserId,
        });
      }
    }

    if (navigation?.extras?.state?.plan) {
      this.plan = Object.assign(new Plan(), navigation.extras.state.plan);
      return this.getCheckoutData(this.partner.id, cartId!, reservationId, onsiteSetupId);
    } else {
      const planId = route.queryParamMap.get('planId');
      return this.planService.getPlan(this.partner.id, parseInt(planId!)).pipe(
        switchMap(response => {
          if (response?.data) {
            this.plan = response.data;
            if (navigation?.extras?.state?.cart) {
              const passedCart: Cart = Object.assign(new Cart(), navigation.extras.state.cart);
              const isCartValid: boolean = passedCart && passedCart.id === cartId && !!passedCart.preparedAt;
              if (isCartValid && !!this.plan) {
                const passedUserId: number | undefined = navigation.extras.state.userId;
                return of({
                  isInOverrideZone: this.isInOverrideZone,
                  cart: passedCart,
                  plan: this.plan,
                  reservationId: reservationId,
                  rescheduleOrderId: this.rescheduleOrderId,
                  userId: passedUserId,
                });
              }
            }
            return this.getCheckoutData(this.partner.id, cartId!, reservationId, onsiteSetupId);
          }
          this.router.navigate([], {});
          return throwError(response);
        }),
        catchError(err => throwError(err)),
      );
    }
  }

  private getCheckoutData(
    partnerId: number,
    cartId: string,
    reservationId: string | null,
    onsiteSetupId?: string,
  ): Observable<CheckoutData> {
    return this.cartService.getCart(partnerId, cartId).pipe(
      switchMap(response => {
        if (response?.data?.preparedAt && !response?.data?.confirmedAt) {
          if (reservationId) {
            return this.prepareCart(response.data, this.plan, reservationId, onsiteSetupId);
          }
          return of({
            isInOverrideZone: this.isInOverrideZone,
            cart: response.data,
            plan: this.plan,
            reservationId,
            rescheduleOrderId: this.rescheduleOrderId,
            userId: undefined,
          });
        } else {
          this.router.navigate(['/box-office'], { queryParamsHandling: 'merge' });
          return of(null as unknown as CheckoutData);
        }
      }),
    );
  }

  private prepareCart(cart: Cart, plan: Plan, reservationId?: string, onsiteSetupId?: string): Observable<CheckoutData> {
    const channelId = this.onsiteSetupsStorageService.getConfiguration()?.channel_id ?? Channel.BoxOffice;
    return this.cartService
      .prepareCart({
        partnerId: this.partner.id,
        cartId: cart.id!,
        userId: cart.userId!,
        planId: plan.id,
        placeId: plan.places![0].id,
        onsiteSetupId: onsiteSetupId,
        channel: channelId,
        ...(this.isInOverrideZone && { overrideCapacity: true }),
      })
      .pipe(
        tap(response =>
          this.onsiteSetupRequiredApiErrorService.logPrepareCartResponseIfOnsiteSetupIdRequired(
            'checkout_resolver_prepare_cart',
            response,
            {
              cartId: cart.id,
              channel: channelId,
              partnerId: this.partner.id,
              placeId: plan.places![0].id,
              planId: plan.id,
              reservationId: reservationId ?? null,
              userId: cart.userId,
            },
          ),
        ),
        switchMap(response => {
          if (response.error) {
            const previousNavigation = this.router.getCurrentNavigation()?.previousNavigation?.finalUrl?.toString();
            const isFromReservation = previousNavigation?.includes('reservation') === true;
            if (this.#fiscalComplianceBlockModalService.openIfNeeded(response)) {
              this.spinnerService.hide();
              this.router.navigate([isFromReservation ? '/reservations/list' : '/box-office'], { queryParamsHandling: 'merge' });
              return EMPTY;
            }
            if (isFromReservation) {
              this.spinnerService.hide();
              const modal = this.modalService.open(MessageModalComponent);
              modal.componentInstance.title = this.translate.instant('common.errorTitle');
              modal.componentInstance.messages = [this.translate.instant(response.error.message)];
              this.router.navigate(['/reservations/list'], { queryParamsHandling: 'merge' });
            } else {
              this.router.navigate(['/box-office'], { queryParamsHandling: 'merge' });
            }
            return of(null as unknown as CheckoutData);
          }
          return of({
            isInOverrideZone: this.isInOverrideZone,
            cart: cart,
            plan: this.plan,
            reservationId: reservationId ?? null,
            rescheduleOrderId: this.rescheduleOrderId,
            userId: undefined,
          });
        }),
      );
  }
}
