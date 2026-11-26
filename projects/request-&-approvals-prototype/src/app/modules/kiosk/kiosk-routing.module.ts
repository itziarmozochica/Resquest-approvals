import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PermissionBasedGuard } from '../../shared/guard/permission-based/permission-based.guard';
import { reloadIfChunkLoadError } from '../../shared/routes/app-routes';
import { BookingQuestionsComponent } from './components/booking-questions/booking-questions.component';
import { bookingQuestionsResolver } from './components/booking-questions/booking-questions.resolver';
import { BookingClaimComponent } from './components/booking/booking-claim/booking-claim.component';
import { BookingDetailComponent } from './components/booking/booking-detail/booking-detail.component';
import { BookingListComponent } from './components/booking/booking-list/booking-list.component';
import { BookingRescheduleComponent } from './components/booking/booking-reschedule/booking-reschedule.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { KioskHomeComponent } from './components/kiosk-home/kiosk-home.component';
import { KioskPlanDetailComponent } from './components/kiosk-plan-detail/kiosk-plan-detail.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';
import { PaymentComponent } from './components/payment/payment.component';
import { kioskTicketingLeaveGuard } from './components/ticketing/kiosk-ticketing-leave.guard';
import { KioskTicketingComponent } from './components/ticketing/kiosk-ticketing.component';
import { KioskConfirmationResolver } from './kiosk-confirmation.resolver';
import { OrderKioskResolver } from './order-kiosk.resolver';
import { bookingOtokenGuard } from './services/booking/booking-otoken.guard';

const routes: Routes = [
  {
    canActivate: [PermissionBasedGuard],
    component: KioskHomeComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'home',
  },
  {
    canActivate: [PermissionBasedGuard],
    component: KioskPlanDetailComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'detail',
  },
  {
    canActivate: [PermissionBasedGuard],
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'category/:categoryId',
    loadComponent: () =>
      import('./components/kiosk-category-plans/kiosk-category-plans.component')
        .then(m => m.KioskCategoryPlansComponent)
        .catch((err: unknown) => reloadIfChunkLoadError(err as { message?: string; name?: string })),
  },
  {
    canActivate: [PermissionBasedGuard],
    canDeactivate: [kioskTicketingLeaveGuard],
    component: KioskTicketingComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'ticketing',
  },
  {
    canActivate: [PermissionBasedGuard],
    component: CheckoutComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'checkout/:cartId',
    resolve: {
      checkoutData: KioskConfirmationResolver,
    },
  },
  {
    canActivate: [PermissionBasedGuard],
    component: BookingQuestionsComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'booking-questions',
    resolve: {
      bookingQuestionsData: bookingQuestionsResolver,
    },
  },
  {
    canActivate: [PermissionBasedGuard],
    component: PaymentComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'payment/:cartId',
    resolve: {
      checkoutData: KioskConfirmationResolver,
    },
  },
  {
    canActivate: [PermissionBasedGuard],
    component: OrderConfirmationComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'order-confirmation/:orderId',
    resolve: {
      orderData: OrderKioskResolver,
    },
  },
  {
    canActivate: [PermissionBasedGuard],
    component: BookingClaimComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'booking/claim',
  },
  {
    canActivate: [PermissionBasedGuard, bookingOtokenGuard],
    component: BookingListComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'booking',
  },
  {
    canActivate: [PermissionBasedGuard, bookingOtokenGuard],
    component: BookingDetailComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'booking/:orderId',
  },
  {
    canActivate: [PermissionBasedGuard, bookingOtokenGuard],
    component: BookingRescheduleComponent,
    data: {
      permission: 'can_view_kiosk',
    },
    path: 'booking/:orderId/reschedule',
  },
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)],
})
export class KioskRoutingModule {}
