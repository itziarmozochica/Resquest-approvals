import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';

import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { IgntAlertComponent, IgntButtonComponent, IgntTooltipDirective } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { defaultIfEmpty, finalize } from 'rxjs/operators';

import { BookingQuestionsService } from '../../booking-questions/booking-questions.service';
import {
  BookingQuestionsFormData,
  BookingQuestionsModalData,
  BookingQuestionsModalTitle,
  BookingQuestionTicketDetails,
} from '../../booking-questions/models';
import { BookingQuestionsFormGroupModule } from '../../booking-questions/modules/form-group/form-group.module';
import {
  applyBookingAnswersRejection,
  BookingAnswersRejectionMessages,
} from '../../booking-questions/utils/apply-booking-answers-rejection.util';
import { buildUnfixableBookingAnswersError } from '../../booking-questions/utils/unfixable-booking-answers-error.util';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { SessionPack } from '../../models/session/session-pack.model';
import { CartService } from '../../services/cart/cart.service';
import { ErrorLoggerService } from '../../services/error-logger/error-logger.service';
import { PartnerService } from '../../services/partner/partner.service';

export interface BookingQuestionsServerError {
  message: string;
  /** True when `message` is a translation key, false when it is the text fever2 sent. */
  translate: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown)': 'onKeyDown($event)',
  },
  imports: [
    BookingQuestionsFormGroupModule,
    ReactiveFormsModule,
    TranslateModule,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntTooltipDirective,
  ],
  selector: 'app-booking-questions',
  styleUrl: './booking-questions-modal.component.scss',
  templateUrl: './booking-questions-modal.component.html',
})
export class BookingQuestionsModalComponent {
  static readonly bookingQuestionsModalId = 'box-office-ticketing-booking-questions-modal';
  static readonly defaultTitleKey = 'bookingQuestionsForm.modalTitle';
  static readonly rejectionMessages: BookingAnswersRejectionMessages = {
    cannotFix: 'bookingQuestionsForm.serverError.cannotFix',
    generic: 'errors.generic',
    invalidAnswers: 'bookingQuestionsForm.serverError.invalidAnswer',
  };
  readonly #bookingQuestionsService = inject(BookingQuestionsService);
  readonly #cartService = inject(CartService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #errorLogger = inject(ErrorLoggerService);
  readonly #dialog: DialogRef<boolean, unknown> = inject(DialogRef<boolean, unknown>);
  readonly #dialogData: BookingQuestionsModalData = inject(DIALOG_DATA);
  readonly #partnerService = inject(PartnerService);
  readonly #formData = signal<BookingQuestionsFormData | null>(null);
  readonly #formGroup = signal<UntypedFormGroup | null>(null);
  readonly #serverError = signal<BookingQuestionsServerError | null>(null);
  readonly #saving = signal(false);

  readonly #title: BookingQuestionsModalTitle | undefined = this.#dialogData.kind === 'pre-booking' ? this.#dialogData.title : undefined;

  readonly customer: Customer | null = this.#dialogData.kind === 'pre-booking' ? (this.#dialogData.customer ?? null) : null;
  readonly formData = this.#formData.asReadonly();
  readonly formGroup = this.#formGroup.asReadonly();
  /** Message shown above the footer when the answers are not saved: a translation key, or fever2's `user_error` as is. */
  readonly serverError = this.#serverError.asReadonly();
  /** True while the answers are being sent, so Continue and Enter cannot send them twice. */
  readonly saving = this.#saving.asReadonly();
  protected readonly titleKey: string = this.#title?.key ?? BookingQuestionsModalComponent.defaultTitleKey;

  constructor() {
    const hasPack = this.#containsSessionPacks();

    if (hasPack) {
      this.#initializeWithSessionPacks();
    } else {
      this.#initializeFormWithSessionDetails();
    }
  }

  onCancel() {
    this.#dialog.close(false);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const formGroupValue = this.formGroup();
      if (formGroupValue?.valid && !this.#saving()) {
        this.onSubmit();
      }
    }
  }

  onSubmit() {
    const formGroupValue = this.formGroup();
    const formDataValue = this.formData();
    if (!formGroupValue || !formDataValue || this.#saving()) {
      return;
    }
    this.#serverError.set(null);
    this.#saving.set(true);
    this.#sendAnswers(formGroupValue, formDataValue)
      .pipe(
        finalize(() => this.#saving.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result: BaseResponse<string | null>) => {
        if (result.error !== null) {
          this.#showRejection(result.error, formGroupValue, formDataValue);
          return;
        }
        this.#dialog.close(true);
      });
  }

  #containsSessionPacks(): boolean {
    return Array.from(this.#dialogData.cart.sessionItemsByDatetime.values())
      .flat()
      .some(session => session.isPack);
  }

  #getSessionDetailsWithPacks(sessionPacks: SessionPack[] | null): [number, BookingQuestionTicketDetails[]] {
    const [numOfTicketsInit, ticketDetailsInit] = this.#getSessionsDetails();
    let numOfTickets = numOfTicketsInit;
    const ticketDetails = [...ticketDetailsInit];

    const isValidData = Array.isArray(sessionPacks) && sessionPacks.length > 0;

    if (isValidData) {
      for (const pack of sessionPacks) {
        if (pack.isPack && Array.isArray(pack.packedSessions)) {
          const suffixForLabel = `${pack.label} -`;
          const mainPlanId = this.#getMainPlanIdForSessionPack(pack.id);
          for (const packedSession of pack.packedSessions) {
            numOfTickets += packedSession.units;
            ticketDetails.push(
              ...Array<BookingQuestionTicketDetails>(packedSession.units).fill({
                label: `${suffixForLabel} ${packedSession.label}`,
                mainPlanId,
                sessionType: {
                  id: packedSession.sessionTypeId!,
                  label: `${suffixForLabel} ${packedSession.label}`,
                  ticketSelectorStepQuantity: 1,
                },
              }),
            );
          }
        }
      }
    }

    return [numOfTickets, ticketDetails];
  }

  #getMainPlanIdForSessionPack(packId: number): number | undefined {
    for (const cartSessions of this.#dialogData.cart.sessionItemsByDatetime.values()) {
      const packSession = cartSessions.find(session => session.isPack && session.sessionId === packId);

      if (packSession?.mainPlanId !== undefined) {
        return packSession.mainPlanId;
      }
    }

    return undefined;
  }

  #getSessionsDetails(): [number, BookingQuestionTicketDetails[]] {
    let numberOfTickets = 0;
    const ticketDetails: BookingQuestionTicketDetails[] = [];
    this.#dialogData.cart.sessionItemsByDatetime.forEach((cartSession: CartSession[]) => {
      cartSession.forEach((cartSession: CartSession) => {
        numberOfTickets += cartSession.units;
        ticketDetails.push(
          ...Array<BookingQuestionTicketDetails>(cartSession.units).fill({
            label: cartSession.sessionName!,
            mainPlanId: cartSession.mainPlanId,
            sessionType: cartSession.sessionType!,
          }),
        );
      });
    });
    return [numberOfTickets, ticketDetails];
  }

  /** Keeps the dialog open with every answer, flags the rejected fields and explains why. */
  #sendAnswers(formGroup: UntypedFormGroup, formData: BookingQuestionsFormData): Observable<BaseResponse<string | null>> {
    const data = this.#dialogData;
    const channelId = data.cart.channel?.id;
    switch (data.kind) {
      case 'post-booking-orders':
        return this.#bookingQuestionsService.sendPostBookingAnswersForOrders(
          data.ordersWithBookingQuestions,
          formGroup,
          formData,
          channelId,
        );
      case 'post-booking-order':
        return this.#bookingQuestionsService.sendPostBookingAnswers(data.order.id!, formGroup, formData, channelId);
      default:
        return this.#bookingQuestionsService.sendPreBookingAnswers(data.cart.id!, formGroup, formData, channelId);
    }
  }

  #showRejection(error: BaseErrorResponse, formGroup: UntypedFormGroup, formData: BookingQuestionsFormData): void {
    const outcome = applyBookingAnswersRejection(error, formGroup, formData, BookingQuestionsModalComponent.rejectionMessages);

    if (outcome.unfixable) {
      // Resubmitting the same answers would fail again: traced so the cases show up in Datadog.
      this.#errorLogger.trace(buildUnfixableBookingAnswersError(outcome.rejection, 'booking-questions-modal'));
    }
    // A `user_error` is not a key: the template translates only when the outcome says so, as the kiosk does.
    this.#serverError.set({ message: outcome.message, translate: outcome.translate });
  }

  #initializeForm(numOfTickets: number, ticketLabels: BookingQuestionTicketDetails[]): void {
    const formData = this.#bookingQuestionsService.getFormData(this.#dialogData.bookingQuestions, numOfTickets, ticketLabels);
    const formGroup = this.#bookingQuestionsService.getFormGroup(formData);
    this.#formData.set(formData);
    this.#formGroup.set(formGroup);
  }

  #initializeFormWithSessionDetails(): void {
    const [numOfTickets, ticketLabels] = this.#getSessionsDetails();
    this.#initializeForm(numOfTickets, ticketLabels);
  }

  #initializeWithSessionPacks(): void {
    const partnerId = this.#partnerService.getPartner()?.id;

    if (!partnerId || !this.#dialogData.cart.id) {
      this.#initializeFormWithSessionDetails();
      return;
    }

    this.#cartService
      .getSessionPacksDetails(partnerId, this.#dialogData.cart.id)
      .pipe(defaultIfEmpty(new BaseResponse<SessionPack[] | null>(null, null)), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response: BaseResponse<SessionPack[] | null>) => {
          const sessionDetails = this.#getSessionDetailsWithPacks(response.data);
          this.#initializeForm(...sessionDetails);
        },
        error: () => {
          this.#initializeFormWithSessionDetails();
        },
      });
  }
}
