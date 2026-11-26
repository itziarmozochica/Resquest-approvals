import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  Signal,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { SplitPaymentCancelledEvent } from '@fz-original/app/core/tracking/core/events/split-payment-cancelled';
import { SplitPaymentChildCancelFailedEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-cancel-failed';
import { SplitPaymentChildCancelSuccessEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-cancel-success';
import { SplitPaymentChildCancelledEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-cancelled';
import { SplitPaymentChildCompletedEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-completed';
import { SplitPaymentChildFailedEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-failed';
import { SplitPaymentChildTriggerFailedEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-trigger-failed';
import { SplitPaymentChildTriggerSuccessEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-trigger-success';
import { SplitPaymentChildTriggeredEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-triggered';
import { SplitPaymentCompletedEvent } from '@fz-original/app/core/tracking/core/events/split-payment-completed';
import { SplitPaymentPollFailedEvent } from '@fz-original/app/core/tracking/core/events/split-payment-poll-failed';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { TimelineItemContentDirective } from '@fz-original/app/shared/components/timeline/directives/timeline-item-content.directive';
import { TimelineItemModel } from '@fz-original/app/shared/components/timeline/models/timeline-item.model';
import { TimelineComponent } from '@fz-original/app/shared/components/timeline/timeline.component';
import { Money } from '@fz-original/app/shared/models/money.model';
import { isSoldOutSessionError } from '@fz-original/app/shared/models/session/session-error-code';
import { MoneyPipe } from '@fz-original/app/shared/pipes/money.pipe';
import { CheckoutLoggerService } from '@fz-original/app/shared/services/checkout-logger/checkout-logger.service';
import { CheckoutStageEnum } from '@fz-original/app/shared/services/checkout-logger/models/checkout-stage.enum';
import { BookStatusEnum } from '@fz-original/app/shared/services/payment-gateways/book-resut/models/book-result-status.model';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, merge, of, Subject, timer } from 'rxjs';
import { catchError, finalize, map, switchMap, take, tap } from 'rxjs/operators';

import { AutoformatNumericInputDirective } from '../../../../../shared/directives/autoformat-numeric-input/autoformat-numeric-input.directive';
import { AutoformatNumericInputModule } from '../../../../../shared/directives/autoformat-numeric-input/autoformat-numeric-input.module';
import { MINIMUM_SPLIT_AMOUNT, MINIMUM_SPLIT_AMOUNT_CENTS } from '../../constants/split-payment.constants';
import {
  isAsyncFiscalFailureStatus,
  isAsyncFiscalReleasePendingStatus,
} from '../../services/france-async-fiscal/france-async-fiscal-status.util';
import {
  SPLIT_PAYMENT_PARAMS,
  SplitPaymentProgressDialogResult,
  SplitPaymentProgressParams,
  SplitPaymentProgressService,
} from '../../services/split-payment-progress/split-payment-progress.service';
import { CartPaymentSessionStatus, CartPaymentsStatusSplit } from '../../services/split-payment/models/split-payment-response.model';
import { SplitItem, SplitItemStatus } from './models/split-payment-progress.model';
import { SplitType, SplitTypeOption } from './models/split-payment-setup.model';
import { getTriggerErrorMessage, getTriggerErrorMessageKey, TriggerErrorBody } from './split-payment-trigger-error.util';

const PAYMENT_STATUS_POLL_INTERVAL_MS = 5000;
/** Cooldown before re-enabling "Send new payment" after triggering a split, in milliseconds. */
const SEND_SPLIT_COOLDOWN_MS = 6000;

function parseAmount(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) || 0 : value;
}

const COMPLETED_STATUSES = [
  'authorised',
  'canceled',
  'cancelled',
  'completed',
  'error',
  'expired',
  'failed',
  'received',
  'refunded',
  'refused',
  'timeout',
  'success',
] as const;

const CHILD_FAILURE_STATUSES = ['error', 'expired', 'failed', 'refused', 'timeout'];
const CHILD_SUCCESS_STATUSES = ['authorised', 'canceled', 'cancelled', 'completed', 'received', 'refunded', 'success'];
const PAID_SPLIT_STATUSES = ['authorised', 'completed', 'received', 'success'];

type SplitDisplayStatus = 'in_progress' | 'cancelled' | 'failed' | 'completed';

function getSplitDisplayStatus(split: SplitItem): SplitDisplayStatus {
  if (split.status === 'in_progress') return 'in_progress';
  const raw = split.rawStatus?.toLowerCase() ?? '';
  if (['canceled', 'cancelled'].some(s => raw.includes(s))) return 'cancelled';
  if (CHILD_FAILURE_STATUSES.some(s => raw.includes(s))) return 'failed';
  return 'completed';
}

function mapApiStatusToSplitStatus(apiStatus: string): SplitItemStatus {
  const lower = apiStatus.toLowerCase();
  if (COMPLETED_STATUSES.some(s => lower.includes(s))) {
    return 'completed';
  }
  return 'in_progress';
}

function mapApiSplitsToSplitItems(splits: CartPaymentsStatusSplit[], currency: string): SplitItem[] {
  return splits.map((s, i) => {
    const created = new Date(s.created_at).getTime();
    const updated = new Date(s.updated_at || s.created_at).getTime();
    const durationSeconds = Math.floor((updated - created) / 1000);
    return {
      amount: new Money(parseAmount(s.amount), currency),
      completedAt: s.updated_at,
      durationSeconds,
      errorCondition: s.error_condition ?? null,
      id: s.id,
      index: i + 1,
      pspDescription: s.psp_reference ?? '',
      rawStatus: s.status,
      status: mapApiStatusToSplitStatus(s.status),
      terminalDescription: s.device_id ?? '',
    };
  });
}

export type SplitPaymentTimelineItem = TimelineItemModel & { split: SplitItem };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AutoformatNumericInputModule,
    DecimalPipe,
    FormsModule,
    IgntButtonComponent,
    IgntIconComponent,
    IgntLinkComponent,
    MoneyPipe,
    NgSelectModule,
    TimelineComponent,
    TimelineItemContentDirective,
    TranslateModule,
  ],
  selector: 'app-split-payment-progress-modal',
  standalone: true,
  styleUrls: ['./split-payment-progress-modal.component.scss'],
  templateUrl: './split-payment-progress-modal.component.html',
})
export class SplitPaymentProgressModalComponent implements OnInit {
  #checkoutLogger = inject(CheckoutLoggerService);
  #destroyRef = inject(DestroyRef);
  #dialogData = inject<SplitPaymentProgressParams | undefined>(DIALOG_DATA, { optional: true });
  #dialogRef = inject<DialogRef<SplitPaymentProgressDialogResult>>(DialogRef, { optional: true });
  #emittedChildIds = new Set<string>();
  #injectedParams = inject(SPLIT_PAYMENT_PARAMS, { optional: true });
  #modalOutcomeSettled = false;
  #releasePendingSeen = false;
  #restartPolling$ = new Subject<void>();
  #splitPaymentProgressService = inject(SplitPaymentProgressService);
  #trackingService = inject(TrackingService);
  #translate = inject(TranslateService);

  readonly MINIMUM_SPLIT_AMOUNT = MINIMUM_SPLIT_AMOUNT;
  get locale(): string {
    return this.#translate.currentLang ?? 'en-US';
  }

  cartId = input.required<string>();
  currency = input.required<string>();
  deviceId = input.required<string>();

  partnerId = input.required<number>();
  paymentGateway = input.required<string>();
  placeId = input.required<number>();
  planId = input.required<number>();
  seed = input.required<number>();
  transactionId = input.required<string>();
  userId = input.required<number>();
  totalAmount = input<number>();
  cancelRefund = output<boolean>();
  orderComplete = output<{ orderId?: number; transactionId?: string }>();
  splitPaymentTriggered = output<void>();

  params: SplitPaymentProgressParams | null = null;

  currentStep: WritableSignal<'setup' | 'progress'> = signal('progress');
  customAmount: WritableSignal<number | null> = signal(null);
  customAmountDirective = viewChild(AutoformatNumericInputDirective);
  customPaymentAmountInput: Signal<ElementRef<HTMLInputElement> | undefined> = viewChild<string, ElementRef<HTMLInputElement>>(
    'customPaymentAmountInput',
    {
      read: ElementRef,
    },
  );
  fiscalFailureDetected: WritableSignal<boolean> = signal(false);
  readonly fiscalSigningHeld: Signal<boolean> = computed(() =>
    this.#splitPaymentProgressService.isFiscalSigningHeld(this.#getParams().cartId),
  );
  readonly fiscalSigningUnresolvable: Signal<boolean> = computed(() =>
    this.#splitPaymentProgressService.isFiscalSigningUnresolvable(this.#getParams().cartId),
  );
  /** A book-result poll failure kept back while the signing is held, see {@link #deferWhileSigningHeld}. */
  #pollFailureDeferredWhileHeld: { error: unknown; params: SplitPaymentProgressParams } | null = null;
  isCancellingAndRefunding: WritableSignal<boolean> = signal(false);
  isCancellingSplit: WritableSignal<boolean> = signal(false);
  isSendingSplit: WritableSignal<boolean> = signal(false);
  numberOfPayments: WritableSignal<number | null> = signal(null);
  numberOfPaymentsInput: Signal<ElementRef<HTMLInputElement> | undefined> = viewChild<string, ElementRef<HTMLInputElement>>(
    'numberOfPaymentsInput',
    { read: ElementRef },
  );
  paidSplitsCount: WritableSignal<number> = signal(0);
  paymentInProgress: WritableSignal<boolean> = signal(true);
  splitError: WritableSignal<string | null> = signal(null);
  /** fever2 refused a payment because no tickets are left (code 803): every later trigger gets the same answer. */
  readonly soldOut: WritableSignal<boolean> = signal(false);
  /**
   * The error the template shows. While the signing is held the cashier faces Sign again / Cancel sale,
   * every payment is already collected, and an error left from before the hold (typically a book-result
   * poll that gave up during `in_flight`) would read as a payment problem under the prompt. It is only
   * hidden, not cleared: a poll restart clears it, and a hold that ends otherwise shows it again.
   */
  readonly displayedSplitError: Signal<string | null> = computed(() => (this.fiscalSigningHeld() ? null : this.splitError()));
  splitType: WritableSignal<SplitType> = signal('equal');
  splitTypeOptions: SplitTypeOption[] = [];
  splits: WritableSignal<SplitItem[]> = signal([]);
  summaryPaid: WritableSignal<Money> = signal(new Money(0, 'EUR'));
  summaryToBePaid: WritableSignal<Money> = signal(new Money(0, 'EUR'));
  summaryTotal: WritableSignal<Money> = signal(new Money(0, 'EUR'));

  readonly maxNumberOfPayments = computed(() => {
    const totalCents = Math.round(this.summaryTotal().amount * 100);
    if (totalCents <= 0) return 0;
    return Math.floor(totalCents / MINIMUM_SPLIT_AMOUNT_CENTS);
  });

  readonly isNumberOfPaymentsValid = computed(() => {
    const n = this.numberOfPayments();
    const max = this.maxNumberOfPayments();
    return n != null && n > 0 && n <= max;
  });

  readonly isSetupValid = computed(() => {
    if (this.splitType() === 'unequal') return true;
    return this.isNumberOfPaymentsValid();
  });

  readonly fixedSplitAmount = computed(() => {
    const n = this.numberOfPayments();
    const totalCents = Math.round(this.summaryTotal().amount * 100);
    if (n == null || n <= 0 || totalCents <= 0) return null;
    return Math.floor(totalCents / n) / 100;
  });

  readonly nextSplitAmount = computed(() => {
    const fixed = this.fixedSplitAmount();
    if (fixed == null) return null;
    const fixedCents = Math.round(fixed * 100);
    const remainingCents = Math.round(this.summaryToBePaid().amount * 100);
    if (remainingCents <= 0) return null;
    // If paying `fixed` would leave less than another full base split, this is the last split: absorb the remainder.
    const afterCents = remainingCents - fixedCents;
    if (afterCents < fixedCents || afterCents <= 0) return remainingCents / 100;
    return fixedCents / 100;
  });

  readonly numberOfPaymentsDisplay = computed(() => `${this.paidSplitsCount()}/${this.numberOfPayments() ?? 0}`);

  /**
   * Edge case: remaining balance is below the minimum split (inconsistent data).
   * The only valid split is paying the exact remainder, so validation errors are suppressed.
   */
  readonly #isRemainingBelowMin = computed(() => {
    const remainingCents = Math.round(this.summaryToBePaid().amount * 100);
    return remainingCents > 0 && remainingCents < MINIMUM_SPLIT_AMOUNT_CENTS;
  });

  readonly isCustomAmountTooLow = computed(() => {
    const amt = this.customAmount();
    if (amt == null) return false;
    if (this.#isRemainingBelowMin()) return false;
    return Math.round(amt * 100) < MINIMUM_SPLIT_AMOUNT_CENTS;
  });

  readonly isCustomAmountExceeding = computed(() => {
    const amt = this.customAmount();
    if (amt == null) return false;
    return Math.round(amt * 100) > Math.round(this.summaryToBePaid().amount * 100);
  });

  readonly wouldLeaveInsufficient = computed(() => {
    const amt = this.customAmount();
    if (amt == null) return false;
    if (this.#isRemainingBelowMin()) return false;
    const afterCents = Math.round(this.summaryToBePaid().amount * 100) - Math.round(amt * 100);
    return afterCents > 0 && afterCents < MINIMUM_SPLIT_AMOUNT_CENTS;
  });

  readonly isCustomAmountValid = computed(() => {
    const amt = this.customAmount();
    if (amt == null || amt <= 0) return false;
    const amtCents = Math.round(amt * 100);
    const remainingCents = Math.round(this.summaryToBePaid().amount * 100);
    if (this.#isRemainingBelowMin()) {
      return amtCents === remainingCents;
    }
    return !this.isCustomAmountTooLow() && !this.isCustomAmountExceeding() && !this.wouldLeaveInsufficient();
  });

  canSendSplit = computed(() => {
    if (
      this.soldOut() ||
      !this.paymentInProgress() ||
      this.isSendingSplit() ||
      this.isLatestSplitInProgress() ||
      this.summaryToBePaid().amount <= 0
    ) {
      return false;
    }
    if (this.splitType() === 'equal') return this.nextSplitAmount() != null;
    return this.isCustomAmountValid();
  });

  isLatestSplitInProgress = computed(() => {
    const list = this.splits();
    if (list.length === 0) return false;
    const last = list[list.length - 1];
    return last.status === 'in_progress';
  });

  timelineItems = computed<SplitPaymentTimelineItem[]>(() => {
    const splitsList = this.splits();
    const lastIndex = splitsList.length - 1;
    return splitsList.map((split, index) => this.#mapSplitToTimelineItem(split, index === lastIndex));
  });

  constructor() {
    effect(() => {
      const step = this.currentStep();
      const type = this.splitType();
      const target =
        step === 'setup' && type === 'equal'
          ? this.numberOfPaymentsInput()
          : step === 'progress' && type === 'unequal'
            ? this.customPaymentAmountInput()
            : null;
      if (!target) return;
      queueMicrotask(() => target.nativeElement.focus({ preventScroll: true }));
    });
  }

  cancelAndRefund(): void {
    this.isCancellingAndRefunding.set(true);
    const params = this.#getParams();
    this.#checkoutLogger.info(
      'Cancel and refund clicked',
      {
        stage: CheckoutStageEnum.SPLIT_PAYMENT_MODAL,
        cartId: params.cartId,
        data: {
          transactionId: params.transactionId,
          partnerId: params.partnerId,
          placeId: params.placeId,
          planId: params.planId,
        },
      },
      { cartId: params.cartId, transactionId: params.transactionId, partnerId: params.partnerId },
    );
    this.#trackingService.track(
      new SplitPaymentCancelledEvent({
        cart_id: params.cartId,
        partner_id: params.partnerId,
        place_id: params.placeId,
        plan_id: params.planId,
        transaction_id: params.transactionId,
      }),
    );

    const closeDialog = (): void => {
      if (this.#modalOutcomeSettled) {
        return;
      }
      this.#modalOutcomeSettled = true;
      this.cancelRefund.emit(true);
      this.#dialogRef?.close({ cancelled: true });
    };

    this.#splitPaymentProgressService
      .cancelPayment({
        currency: params.currency,
        partnerId: params.partnerId,
        placeId: params.placeId,
        planId: params.planId,
        transactionId: params.transactionId,
      })
      .pipe(
        finalize(() => {
          this.isCancellingAndRefunding.set(false);
          this.paymentInProgress.set(false);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: closeDialog,
        next: closeDialog,
      });
  }

  cancelCurrentSplit(split: SplitItem): void {
    const params = this.#getParams();
    this.#checkoutLogger.info(
      'Cancel current split clicked',
      {
        stage: CheckoutStageEnum.SPLIT_PAYMENT_MODAL,
        cartId: params.cartId,
        data: {
          transactionId: params.transactionId,
          partnerId: params.partnerId,
          splitId: split.id ?? null,
          splitIndex: split.index,
        },
      },
      { cartId: params.cartId, transactionId: params.transactionId, partnerId: params.partnerId },
    );
    if (!split.id) {
      this.splitError.set(this.#translate.instant('boxOffice.waitPaymentModal.splitPaymentError'));
      return;
    }
    this.#trackingService.track(
      new SplitPaymentChildCancelledEvent({
        cart_id: params.cartId,
        child_transaction_id: split.id,
        partner_id: params.partnerId,
        split_index: split.index,
        transaction_id: params.transactionId,
      }),
    );
    this.isCancellingSplit.set(true);
    this.splitError.set(null);

    this.#splitPaymentProgressService
      .cancelChildSplit(params.partnerId, params.cartId, split.id)
      .pipe(
        finalize(() => this.isCancellingSplit.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (err: { error?: string | { error?: string } }) => {
          const msg = typeof err?.error === 'string' ? err.error : ((err?.error as { error?: string })?.error ?? undefined);
          const errorMsg = msg ?? this.#translate.instant('boxOffice.waitPaymentModal.splitPaymentError');
          this.splitError.set(errorMsg);
          this.#trackingService.track(
            new SplitPaymentChildCancelFailedEvent({
              cart_id: params.cartId,
              child_transaction_id: split.id!,
              error: msg ?? 'Unknown error',
              partner_id: params.partnerId,
              transaction_id: params.transactionId,
            }),
          );
        },
        next: result => {
          if (result.success) {
            this.#trackingService.track(
              new SplitPaymentChildCancelSuccessEvent({
                cart_id: params.cartId,
                child_transaction_id: split.id!,
                partner_id: params.partnerId,
                transaction_id: params.transactionId,
              }),
            );
            this.#restartPolling$.next();
          } else {
            const errorMsg = result.error ?? this.#translate.instant('boxOffice.waitPaymentModal.splitPaymentError');
            this.splitError.set(errorMsg);
            this.#trackingService.track(
              new SplitPaymentChildCancelFailedEvent({
                cart_id: params.cartId,
                child_transaction_id: split.id!,
                error: result.error ?? 'Unknown error',
                partner_id: params.partnerId,
                transaction_id: params.transactionId,
              }),
            );
          }
        },
      });
  }

  ngOnInit(): void {
    this.splitTypeOptions = [
      {
        description: this.#translate.instant('boxOffice.splitPaymentProgressModal.equalSplitDescription'),
        label: this.#translate.instant('boxOffice.splitPaymentProgressModal.equalSplit'),
        value: 'equal',
      },
      {
        description: this.#translate.instant('boxOffice.splitPaymentProgressModal.unequalSplitDescription'),
        label: this.#translate.instant('boxOffice.splitPaymentProgressModal.unequalSplit'),
        value: 'unequal',
      },
    ];

    const params = this.#getParams();
    const total = params.totalAmount ?? 0;
    this.summaryTotal.set(new Money(total, params.currency));
    this.summaryToBePaid.set(new Money(total, params.currency));
    this.currentStep.set('setup');
  }

  /**
   * Exit for a detected fiscal failure. The refund is server-side, so this only closes the dialog with
   * the neutral result: no `cancelRefund`, no `CancelledTransaction`. The cashier must always have a way
   * out, because the watch that normally closes this dialog can be absent (flag off), already expired
   * or torn down, and "Cancel and refund" is disabled here to avoid racing the server-side refund.
   * It is also the exit for a signing the watch reports as unresolvable: nothing is refunded there and
   * the payments stay held for support, but closing the dialog does not touch them either.
   */
  closeAfterFiscalFailure(): void {
    if (this.#modalOutcomeSettled) {
      return;
    }
    this.#modalOutcomeSettled = true;
    this.#dialogRef?.close({ fiscalFailureClosed: true });
  }

  closeModal(): void {
    this.cancelRefund.emit(true);
    this.#dialogRef?.close({ cancelled: true });
  }

  continueToPayment(): void {
    if (!this.isSetupValid()) return;

    this.currentStep.set('progress');
    const params = this.#getParams();
    this.#startPolling(params);

    if (this.splitType() === 'equal') {
      this.#triggerSplitWithAmount(this.nextSplitAmount()!);
    }
  }

  onCustomAmountRawValue(value: number): void {
    this.customAmount.set(Number.isFinite(value) && value > 0 ? value : null);
  }

  onNumberOfPaymentsChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.numberOfPayments.set(+el.value || null);
  }

  onSplitTypeChange(value: SplitType): void {
    this.splitType.set(value);
    this.numberOfPayments.set(null);
  }

  sendNextSplit(): void {
    if (!this.canSendSplit()) {
      return;
    }

    const params = this.#getParams();
    const amount = this.#getAmountForNextSplit();
    const splitIndex = this.splits().length + 1;
    this.#checkoutLogger.info(
      'Send new payment clicked',
      {
        stage: CheckoutStageEnum.SPLIT_PAYMENT_MODAL,
        cartId: params.cartId,
        data: {
          transactionId: params.transactionId,
          partnerId: params.partnerId,
          splitIndex: splitIndex,
        },
      },
      { cartId: params.cartId, transactionId: params.transactionId, partnerId: params.partnerId },
    );
    this.#trackingService.track(
      new SplitPaymentChildTriggeredEvent({
        cart_id: params.cartId,
        partner_id: params.partnerId,
        split_index: splitIndex,
        transaction_id: params.transactionId,
      }),
    );
    this.isSendingSplit.set(true);
    this.splitError.set(null);

    this.#splitPaymentProgressService
      .triggerNextPayment(params.partnerId, params.cartId, amount)
      .pipe(
        finalize(() => {
          timer(SEND_SPLIT_COOLDOWN_MS)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(() => this.isSendingSplit.set(false));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (err: { error?: TriggerErrorBody }) => {
          this.#reportTriggerError(err.error);
          this.#trackingService.track(
            new SplitPaymentChildTriggerFailedEvent({
              cart_id: params.cartId,
              error: getTriggerErrorMessage(err.error) ?? 'Unknown error',
              partner_id: params.partnerId,
              split_index: splitIndex,
              transaction_id: params.transactionId,
            }),
          );
        },
        next: result => {
          if (!result.success) {
            const errorMsg = result.error ?? this.#translate.instant('boxOffice.waitPaymentModal.splitPaymentError');
            this.splitError.set(errorMsg);
            this.#trackingService.track(
              new SplitPaymentChildTriggerFailedEvent({
                cart_id: params.cartId,
                error: result.error ?? 'Unknown error',
                partner_id: params.partnerId,
                split_index: splitIndex,
                transaction_id: params.transactionId,
              }),
            );
          } else {
            this.#trackingService.track(
              new SplitPaymentChildTriggerSuccessEvent({
                cart_id: params.cartId,
                partner_id: params.partnerId,
                split_index: splitIndex,
                transaction_id: params.transactionId,
              }),
            );
            this.splitPaymentTriggered.emit();
            this.#restartPolling$.next();
          }
        },
      });
  }

  #getAmountForNextSplit(): number | undefined {
    if (this.splitType() === 'equal') return this.nextSplitAmount() ?? undefined;
    return this.customAmount() ?? undefined;
  }

  #reportTriggerError(body: TriggerErrorBody | undefined): void {
    if (isSoldOutSessionError(body)) {
      this.soldOut.set(true);
      this.splitError.set(this.#soldOutText(this.summaryPaid()));
      return;
    }
    this.splitError.set(this.#resolveTriggerErrorText(body));
  }

  #soldOutText(collected: Money): string {
    if (collected.amount <= 0) {
      return this.#translate.instant('boxOffice.waitPaymentModal.soldOutNothingCharged');
    }
    return this.#translate.instant('boxOffice.waitPaymentModal.soldOut', {
      amount: collected.toString(this.locale),
    });
  }

  #resolveTriggerErrorText(body: TriggerErrorBody | undefined): string {
    const messageKey = getTriggerErrorMessageKey(body);
    if (messageKey !== undefined) {
      return this.#translate.instant(messageKey);
    }
    return getTriggerErrorMessage(body) ?? this.#translate.instant('boxOffice.waitPaymentModal.splitPaymentError');
  }

  #triggerSplitWithAmount(amount: number): void {
    const params = this.#getParams();
    this.isSendingSplit.set(true);
    this.splitError.set(null);

    const splitIndex = this.splits().length + 1;
    this.#checkoutLogger.info(
      'Auto-triggering first split',
      {
        stage: CheckoutStageEnum.SPLIT_PAYMENT_MODAL,
        cartId: params.cartId,
        data: { transactionId: params.transactionId, partnerId: params.partnerId, splitIndex, amount },
      },
      { cartId: params.cartId, transactionId: params.transactionId, partnerId: params.partnerId },
    );
    this.#trackingService.track(
      new SplitPaymentChildTriggeredEvent({
        cart_id: params.cartId,
        partner_id: params.partnerId,
        split_index: splitIndex,
        transaction_id: params.transactionId,
      }),
    );

    this.#splitPaymentProgressService
      .triggerNextPayment(params.partnerId, params.cartId, amount)
      .pipe(
        finalize(() => {
          timer(SEND_SPLIT_COOLDOWN_MS)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(() => this.isSendingSplit.set(false));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (err: { error?: TriggerErrorBody }) => {
          this.#reportTriggerError(err.error);
        },
        next: result => {
          if (result.success) {
            this.splitPaymentTriggered.emit();
            this.#restartPolling$.next();
          } else {
            this.splitError.set(result.error ?? this.#translate.instant('boxOffice.waitPaymentModal.splitPaymentError'));
          }
        },
      });
  }

  /**
   * While the signing is held for the cashier (Sign again / Cancel sale), a book-result poll that gave
   * up says nothing about the payments, and the generic error under the prompt would read as a payment
   * problem. It is kept for when the hold ends: a resume restarts the poll (which drops it), a
   * cancelled or unresolvable sale has its own message, and only a hold that ends otherwise (watch
   * expired, prompt left unanswered, 403/404) still shows it.
   */
  #deferWhileSigningHeld(params: SplitPaymentProgressParams, error: unknown): boolean {
    if (!this.fiscalSigningHeld()) {
      return false;
    }
    this.#pollFailureDeferredWhileHeld = { error, params };
    return true;
  }

  /** Runs when the hold is released: a poll failure still kept back (no restart dropped it) is reported now. */
  #reportPollFailureDeferredWhileHeld(): void {
    const deferred = this.#pollFailureDeferredWhileHeld;
    if (deferred === null) {
      return;
    }
    this.#pollFailureDeferredWhileHeld = null;
    this.#reportBookResultPollFailure(deferred.params, deferred.error);
  }

  #trackFiscalFailureStatus(status: CartPaymentSessionStatus | undefined): void {
    if (isAsyncFiscalFailureStatus(status, this.#releasePendingSeen)) {
      this.fiscalFailureDetected.set(true);
    }
    this.#releasePendingSeen = this.#releasePendingSeen || isAsyncFiscalReleasePendingStatus(status);
  }

  /**
   * The 1.5 s fiscal watch can detect the KO and still be inside `discardCart` while this modal's 5 s
   * poll is one status behind, so the watch's own signal is checked too: without it a `cancelled`
   * session with no release-pending status seen here would paint the generic poll error under the
   * fiscal-failure flow and fire a spurious poll-failed event.
   */
  #isFiscalFailureInFlight(): boolean {
    if (this.fiscalFailureDetected()) {
      return true;
    }
    if (!this.#splitPaymentProgressService.isFiscalFailureDetected(this.#getParams().cartId)) {
      return false;
    }
    this.fiscalFailureDetected.set(true);
    return true;
  }

  #emitChildStatusEvents(splits: CartPaymentsStatusSplit[], currency: string, params: SplitPaymentProgressParams): void {
    for (let i = 0; i < splits.length; i += 1) {
      const s = splits[i];
      if (this.#emittedChildIds.has(s.id)) {
        continue;
      }
      const lower = s.status.toLowerCase();
      const isSuccess = CHILD_SUCCESS_STATUSES.some(st => lower.includes(st));
      const isFailure = CHILD_FAILURE_STATUSES.some(st => lower.includes(st));
      if (!isSuccess && !isFailure) {
        continue;
      }
      this.#emittedChildIds.add(s.id);
      const basePayload = {
        cart_id: params.cartId,
        child_transaction_id: s.id,
        partner_id: params.partnerId,
        split_index: i + 1,
        transaction_id: params.transactionId,
      };
      if (isSuccess) {
        this.#trackingService.track(
          new SplitPaymentChildCompletedEvent({
            ...basePayload,
            amount: parseAmount(s.amount),
            status: s.status,
          }),
        );
        if (this.splitType() === 'unequal') {
          this.customAmount.set(null);
          this.customAmountDirective()?.writeValue(0);
          queueMicrotask(() => this.customPaymentAmountInput()?.nativeElement.focus({ preventScroll: true }));
        }
      } else {
        this.#trackingService.track(
          new SplitPaymentChildFailedEvent({
            ...basePayload,
            status: s.status,
          }),
        );
      }
    }
  }

  #getParams(): SplitPaymentProgressParams {
    if (this.#dialogData) {
      return this.#dialogData;
    }
    if (this.#injectedParams) {
      return this.#injectedParams;
    }
    if (this.params) {
      return this.params;
    }
    return this.#getParamsFromInputs();
  }

  #getParamsFromInputs(): SplitPaymentProgressParams {
    return {
      cartId: this.cartId(),
      currency: this.currency(),
      deviceId: this.deviceId(),
      partnerId: this.partnerId(),
      paymentGateway: this.paymentGateway(),
      placeId: this.placeId(),
      planId: this.planId(),
      seed: this.seed(),
      totalAmount: this.totalAmount(),
      transactionId: this.transactionId(),
      userId: this.userId(),
    };
  }

  #mapSplitToTimelineItem(split: SplitItem, isLast: boolean): SplitPaymentTimelineItem {
    const id = split.id ?? `split-${split.index}`;
    const isCompleted = split.status === 'completed';
    const displayStatus = getSplitDisplayStatus(split);
    const isFailedOrCancelled = displayStatus === 'cancelled' || displayStatus === 'failed';
    const prefix = 'boxOffice.splitPaymentProgressModal.';
    const n = split.index;
    const titleKeyByStatus: Record<SplitDisplayStatus, string> = {
      cancelled: `${prefix}timelineTitleCancelled`,
      completed: `${prefix}timelineTitleCompleted`,
      failed: `${prefix}timelineTitleFailed`,
      in_progress: `${prefix}timelineTitleProcessing`,
    };
    const title = this.#translate.instant(titleKeyByStatus[displayStatus], { n });
    const showAmountTag = displayStatus === 'completed';
    const tagSentimentMap: Record<SplitDisplayStatus, 'disable' | 'info' | 'positive'> = {
      cancelled: 'disable',
      completed: 'positive',
      failed: 'disable',
      in_progress: 'info',
    };
    return {
      contentTemplateKey: isCompleted ? 'split-completed' : 'split-in-progress',
      datetime: split.completedAt ?? '',
      description: '',
      icon: isFailedOrCancelled ? ['fal', 'times-circle'] : isCompleted ? ['fal', 'check-circle'] : ['fas', 'spinner'],
      iconAnimation: isCompleted ? 'none' : 'spin',
      iconSentiment: isFailedOrCancelled ? 'failed' : isCompleted ? 'success' : 'default',
      id,
      initialExpanded: displayStatus === 'in_progress' && isLast,
      split,
      tagSentiment: tagSentimentMap[displayStatus],
      tagText: showAmountTag ? split.amount.toString(this.locale) : '',
      title,
    };
  }

  #reportBookResultPollFailure(params: SplitPaymentProgressParams, error: unknown): void {
    // An unresolvable signing already tells the cashier what happened; the generic poll error under it
    // would read as a payment problem.
    if (this.fiscalSigningUnresolvable() || this.#isFiscalFailureInFlight()) {
      return;
    }
    if (this.#deferWhileSigningHeld(params, error)) {
      return;
    }
    const soldOut = isSoldOutSessionError(error);
    this.#splitPaymentProgressService
      .getCartPaymentsStatus(params.partnerId, params.cartId, params.transactionId)
      .pipe(
        take(1),
        catchError(() => of(null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(status => {
        if (status !== null) {
          this.#trackFiscalFailureStatus(status.status);
        }
        if (this.fiscalSigningUnresolvable() || this.#isFiscalFailureInFlight() || this.#deferWhileSigningHeld(params, error)) {
          return;
        }
        if (!this.soldOut()) {
          // The booking only runs once the payments cover the cart, so the whole total was collected
          // even when the 5 s summary poll has not caught up with the last payment yet.
          this.splitError.set(
            soldOut ? this.#soldOutText(this.summaryTotal()) : this.#translate.instant('boxOffice.waitPaymentModal.pollVerificationFailed'),
          );
          this.soldOut.set(soldOut);
        }
        this.#trackingService.track(
          new SplitPaymentPollFailedEvent({
            cart_id: params.cartId,
            partner_id: params.partnerId,
            transaction_id: params.transactionId,
          }),
        );
      });
  }

  #startPolling(params: SplitPaymentProgressParams): void {
    const total = params.totalAmount ?? 0;
    const currency = params.currency;

    this.summaryTotal.set(new Money(total, currency));
    this.summaryPaid.set(new Money(0, currency));
    this.summaryToBePaid.set(new Money(total, currency));
    this.splits.set([]);

    merge(timer(0, PAYMENT_STATUS_POLL_INTERVAL_MS), this.#restartPolling$.pipe(map(() => 0)))
      .pipe(
        switchMap(() =>
          this.#splitPaymentProgressService.getCartPaymentsStatus(params.partnerId, params.cartId, params.transactionId).pipe(
            catchError(() => {
              // Payment status fetch can fail (e.g. 404 before first split); keep initial state, continue polling
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: res => {
          this.#trackFiscalFailureStatus(res.status);
          const sorted = [...res.splits].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          this.#emitChildStatusEvents(sorted, currency, params);
          this.splits.set(mapApiSplitsToSplitItems(sorted, currency));
          const paid = parseAmount(res.split_paid_amount ?? 0);
          const total = parseAmount(res.amount ?? 0);
          this.summaryPaid.set(new Money(paid, currency));
          this.summaryToBePaid.set(new Money(total - paid, currency));
          this.paidSplitsCount.set(sorted.filter(s => PAID_SPLIT_STATUSES.some(st => s.status.toLowerCase().includes(st))).length);
        },
      });

    this.#splitPaymentProgressService
      .fiscalSigningReleases(params.cartId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#reportPollFailureDeferredWhileHeld());

    // The fiscal watch restarts this poll after Sign again, which can land long after the first poll
    // gave up: without it a late signing creates the order and nothing ever prints the tickets.
    merge(
      of(undefined),
      this.#splitPaymentProgressService.bookResultRestarts(params.cartId).pipe(
        tap(() => {
          this.splitError.set(null);
          this.soldOut.set(false);
          this.#pollFailureDeferredWhileHeld = null;
        }),
      ),
    )
      .pipe(
        switchMap(() =>
          this.#splitPaymentProgressService.pollBookResult(params, this.#restartPolling$).pipe(
            catchError((error: unknown) => {
              this.#reportBookResultPollFailure(params, error);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: response => {
          if (response.data?.status === BookStatusEnum.Completed) {
            if (this.#modalOutcomeSettled) {
              return;
            }
            this.#modalOutcomeSettled = true;
            this.paymentInProgress.set(false);
            const splitCount = this.splits().length;
            this.#trackingService.track(
              new SplitPaymentCompletedEvent({
                cart_id: params.cartId,
                currency,
                order_id: response.data.orderId,
                partner_id: params.partnerId,
                split_count: splitCount,
                total_amount: params.totalAmount ?? 0,
                transaction_id: params.transactionId,
              }),
            );
            const payload = {
              orderId: response.data.orderId,
              transactionId: response.data.transactionId,
            };
            this.orderComplete.emit(payload);
            this.#dialogRef?.close(payload);
          }
        },
      });
  }
}
