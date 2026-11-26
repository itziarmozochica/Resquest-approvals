import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

import { Cart } from '../../shared/models/cart/cart.model';
import { Customer } from '../../shared/models/customer/customer.model';
import { Plan } from '../../shared/models/plan/plan.model';
import { CartService } from '../../shared/services/cart/cart.service';
import { PartnerService } from '../../shared/services/partner/partner.service';
import { PlanService } from '../../shared/services/plan/plan.service';
import { KioskNavigationService } from './shared/kiosk-navigation.service';

export interface CheckoutData {
  cart: Cart;
  plan: Plan;
  customer: Customer;
}

@Injectable({
  providedIn: 'root',
})
export class KioskConfirmationResolver {
  private plan: Plan;
  private customer: Customer;

  constructor(
    private cartService: CartService,
    private partnerService: PartnerService,
    private router: Router,
    private kioskNavigationService: KioskNavigationService,
    private planService: PlanService,
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<CheckoutData> {
    const navigation = this.router.getCurrentNavigation();
    const cartId = route.paramMap.get('cartId');

    if (navigation?.extras?.state) {
      const passedCart: Cart = Object.assign(new Cart(), navigation.extras.state.cart);
      const passedCustomer: Customer = { ...navigation.extras.state.customer };
      const isCartValid: boolean = passedCart && passedCart.id === cartId;

      if (isCartValid && !!navigation.extras.state.plan) {
        this.plan = Object.assign(new Plan(), navigation.extras.state.plan);
        this.customer = passedCustomer;
        return of({ cart: passedCart, plan: this.plan, customer: this.customer });
      }
    }

    const partner = this.partnerService.getPartner();
    if (navigation?.extras?.state?.plan) {
      this.plan = Object.assign(new Plan(), navigation.extras.state.plan);
      this.customer = { ...navigation.extras.state.customer };
      return this.getCheckoutData(partner.id, cartId);
    } else {
      const planId = route.queryParamMap.get('planId');
      return this.planService.getPlan(partner.id, parseInt(planId)).pipe(
        mergeMap(response => {
          if (response?.data) {
            this.plan = response.data;
            if (navigation?.extras?.state?.cart) {
              const passedCart: Cart = Object.assign(new Cart(), navigation.extras.state.cart);
              const isCartValid: boolean = passedCart && passedCart.id === cartId;
              if (isCartValid && !!this.plan) {
                this.customer = { ...navigation.extras.state.customer };
                return of({ cart: passedCart, plan: this.plan, customer: this.customer });
              }
            }
            return this.getCheckoutData(partner.id, cartId);
          }
          this.router.navigate([], {});
          return throwError(response);
        }),
        catchError(err => throwError(err)),
      );
    }
  }

  private getCheckoutData(partnerId: number, cartId: string): Observable<CheckoutData> {
    return this.cartService.getCart(partnerId, cartId).pipe(
      map(response => {
        if (response?.data) {
          return { cart: response.data, plan: this.plan, customer: this.customer };
        } else {
          this.kioskNavigationService.navigateHome();
          return null;
        }
      }),
    );
  }
}
