import { Dialog } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UntypedFormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { DatadogLogLevel } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { TranslateService } from '@ngx-translate/core';

import { ClickKioskPaymentData, ClickKioskPaymentEvent } from '../../../../core/tracking/core/events/click-kiosk-payment';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { BookingQuestionsService } from '../../../../shared/booking-questions/booking-questions.service';
import { BookingQuestion, BookingQuestionsFormData, BookingQuestionTicketDetails } from '../../../../shared/booking-questions/models';
import {
  applyBookingAnswersRejection,
  BookingAnswersRejectionMessages,
} from '../../../../shared/booking-questions/utils/apply-booking-answers-rejection.util';
import { buildUnfixableBookingAnswersError } from '../../../../shared/booking-questions/utils/unfixable-booking-answers-error.util';
import { BaseErrorResponse } from '../../../../shared/models/base-response';
import { Cart } from '../../../../shared/models/cart/cart.model';
import { Plan } from '../../../../shared/models/plan/plan.model';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import { CartService } from '../../../../shared/services/cart/cart.service';
import { ErrorLoggerService } from '../../../../shared/services/error-logger/error-logger.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { Channel } from '../../../../shared/services/session-availability/channel.enum';
import { KioskInactivityResetContext, kioskInactivityResetMessage } from '../../models/kiosk-real-time-seating.model';
import { IdleService } from '../../services/idle/idle.service';
import { KioskStorageService } from '../../services/kiosk-storage.service';
import { KioskService } from '../../services/kiosk.service';
import { KioskErrorModalComponent } from '../../shared/components/modals/kiosk-error/kiosk-error-modal.component';
import { KioskNavigationService } from '../../shared/kiosk-navigation.service';
import { isKioskRealTimeCart } from '../../utils/kiosk-real-time-seating.util';
import { Customer } from './../../../../shared/models/customer/customer.model';

@Component({
  selector: 'app-kiosk-booking-questions',
  standalone: false,
  templateUrl: './booking-questions.component.html',
  styleUrls: ['../../../../../theme/general/_box-office.scss', './booking-questions.component.scss'],
})
export class BookingQuestionsComponent implements OnInit {
  static readonly rejectionMessages: BookingAnswersRejectionMessages = {
    cannotFix: 'bookingQuestionsForm.serverError.cannotFix',
    generic: 'errors.generic',
    invalidAnswers: 'kiosk.booking-questions.error-modal.message',
  };
  readonly #bookingQuestionsService = inject(BookingQuestionsService);
  readonly #cartService = inject(CartService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(Dialog);
  readonly #errorLogger = inject(ErrorLoggerService);
  readonly #idleService = inject(IdleService);
  readonly #kioskNavigationService = inject(KioskNavigationService);
  readonly #kioskService = inject(KioskService);
  readonly #kioskStorageService = inject(KioskStorageService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #route = inject(ActivatedRoute);
  readonly #trackingService = inject(TrackingService);
  readonly #translateService = inject(TranslateService);
  bookingQuestions: BookingQuestion[] = [];
  cart: Cart | null = null;
  customer: Customer | null = null;
  formData!: BookingQuestionsFormData;
  formGroup!: UntypedFormGroup;
  plan: Plan | null = null;

  ngOnInit(): void {
    this.#idleService
      .get(60)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#logInactivityReset();
        this.#discardCartAndNavigateHome();
      });
    this.bookingQuestions = this.#route.snapshot.data.bookingQuestionsData.bookingQuestions;
    this.plan = this.#route.snapshot.data.bookingQuestionsData.plan;
    this.cart = this.#route.snapshot.data.bookingQuestionsData.cart;
    this.customer = this.#route.snapshot.data.bookingQuestionsData.customer;
    const [numOfTickets, ticketLabels] = this.#getSessionsDetails();
    this.formData = this.#bookingQuestionsService.getFormData(this.bookingQuestions, numOfTickets, ticketLabels);
    this.formGroup = this.#bookingQuestionsService.getFormGroup(this.formData);
  }

  onBackClicked(): void {
    this.#kioskNavigationService.navigateBack();
  }

  onContinueClicked(): void {
    if (!this.cart?.id || !this.customer) {
      return;
    }

    const cartId = this.cart.id;
    const cart = this.cart;
    const customer = this.customer;

    this.#bookingQuestionsService.sendPreBookingAnswers(cartId, this.formGroup, this.formData, Channel.Kiosk).subscribe(result => {
      if (!result.data) {
        this.#showRejection(result.error);
        return;
      }

      this.#trackingService.track(new ClickKioskPaymentEvent(this.#createPaymentEventData(cartId, customer)));

      this.#kioskNavigationService.navigatePayment(cart, customer);
    });
  }

  /** Only a real-time cart holds a OneBox basket worth releasing; any other cart is left to expire, as before. */
  #discardCartAndNavigateHome(): void {
    const cartId: string | undefined = this.cart?.id;
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    if (!this.#isRealTimeCart() || cartId === undefined || partnerId === undefined) {
      this.#kioskNavigationService.navigateHome();
      return;
    }
    this.#cartService
      .discardCart({ cartId, partnerId })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        complete: () => this.#kioskNavigationService.navigateHome(),
        error: () => this.#kioskNavigationService.navigateHome(),
      });
  }

  #isRealTimeCart(): boolean {
    const isStepperFlowEnabled: boolean = this.#optimizelyService.isFeatureEnabled(FeatureFlags.KIOSK_STEPPER_FLOW) ?? false;
    return isKioskRealTimeCart(isStepperFlowEnabled, this.#kioskStorageService.getPlan(), this.cart);
  }

  #logInactivityReset(): void {
    const context: KioskInactivityResetContext = {
      cartId: this.cart?.id,
      hasLiveRealTimeBasket: this.#isRealTimeCart(),
      planId: this.plan?.id,
      screen: 'booking_questions',
    };
    this.#kioskService.logTrace(kioskInactivityResetMessage, DatadogLogLevel.Info, context);
  }

  #createPaymentEventData(cartId: string, customer: Customer): ClickKioskPaymentData {
    return {
      cartId,
      customerId: customer.id,
    };
  }

  /** The form keeps every answer: flag the fields fever2 rejected and explain why in the error modal. */
  #showRejection(error: BaseErrorResponse | null): void {
    this.#dialog.open(KioskErrorModalComponent, {
      data: {
        title: this.#translateService.instant('common.errorTitle'),
        messages: [this.#rejectionMessage(error)],
        buttonLabel: this.#translateService.instant('common.accept'),
      },
    });
  }

  #rejectionMessage(error: BaseErrorResponse | null): string {
    if (error === null) {
      return this.#translateService.instant('errors.generic');
    }
    const outcome = applyBookingAnswersRejection(error, this.formGroup, this.formData, BookingQuestionsComponent.rejectionMessages);
    if (outcome.unfixable) {
      // Resubmitting the same answers would fail again: traced so the cases show up in Datadog.
      this.#errorLogger.trace(buildUnfixableBookingAnswersError(outcome.rejection, 'kiosk-booking-questions'));
    }

    return outcome.translate ? this.#translateService.instant(outcome.message) : outcome.message;
  }

  #getSessionsDetails(): [number, BookingQuestionTicketDetails[]] {
    let numberOfTickets = 0;
    const ticketDetails: BookingQuestionTicketDetails[] = [];

    if (!this.cart) {
      return [numberOfTickets, ticketDetails];
    }

    this.cart.sessionItemsByDatetime.forEach(cartSession => {
      cartSession.forEach(session => {
        numberOfTickets += session.units;
        ticketDetails.push(
          ...Array(session.units).fill({
            label: session.sessionName,
            mainPlanId: session.mainPlanId,
            sessionType: session.sessionType,
          }),
        );
      });
    });
    return [numberOfTickets, ticketDetails];
  }
}
