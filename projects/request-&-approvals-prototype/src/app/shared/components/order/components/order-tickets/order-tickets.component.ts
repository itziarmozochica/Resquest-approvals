import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, Signal, WritableSignal } from '@angular/core';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { OboPrinterTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { CheckInStatus } from '@fz-original/app/shared/enums/check-in-status.enum';
import { OrderAction } from '@fz-original/app/shared/enums/order-action.enum';
import { OrderActionEvent } from '@fz-original/app/shared/models/order/order-action.model';
import { isCancellationInsuranceSessionType } from '@fz-original/app/shared/models/session-type/session-type.util';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TicketSelectionState } from '@fz-original/app/shared/utils/ticket-selection-state';
import { TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import moment from 'moment';
import { Observable } from 'rxjs';

import { ValidationStatus } from '../../../../../modules/validation/enums/validation-status.enum';
import { BookingAnswer } from '../../../../models/booking-questions/booking-answer.model';
import { CartSession } from '../../../../models/cart/cart-session.model';
import { TransferTypeEnum } from '../../../../models/cart/transfer-type.enum';
import { AccessTicket } from '../../../../models/order/access-ticket.model';
import { CancellationInsurancePartnerShare } from '../../../../models/order/cancellation-insurance-partner-share.model';
import { CheckInDetails } from '../../../../models/order/check-in-details.model';
import { OptimizelyService } from '../../../../optimizely/optimizely.service';
import { Permissions } from '../../../../services/user/permissions';
import { CartUtil } from '../../../../utils/cart.util';
import { isNonZeroNumber } from '../../../../utils/number.util';
import { shouldShowReferencePrice } from '../../../../utils/reference-price.util';
import { FAKE_IDS } from '../order.constants';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.order-tickets--detail-page]': 'orderDetailLayout()' },
  selector: 'app-order-tickets',
  standalone: false,
  styleUrl: './order-tickets.component.scss',
  templateUrl: './order-tickets.component.html',
})
export class OrderTicketsComponent {
  session = input.required<CartSession>();
  ticketsAndProducts = input.required<Map<string, AccessTicket>>();
  ticketSelection = input.required<TicketSelectionState>();
  actionResolvedEvent = input<Observable<OrderActionEvent>>();
  allowSplitPack = input<boolean>(false);
  hiddenValidation = input<boolean>(false);
  isCollapsed = input<boolean>(false);
  orderBookingAnswers = input<BookingAnswer[] | undefined>(undefined);
  orderId = input<number | null>(null);
  pendingToSchedule = input<boolean>(false);
  searchedQRCode = input<string>();
  readonly showReferencePrice = input<boolean>(false);
  readonly showsCoveredByFeverAsInactive = input<boolean>(false);
  readonly orderDetailLayout = input<boolean>(false);
  transfers = input<CartSession[]>([]);

  action = output<OrderActionEvent>();
  isCollapsedChange = output<boolean>();

  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #userService = inject(UserService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);

  protected readonly isAdyenPrinter: boolean =
    this.#onsiteSetupsStorageService.getConfiguration()?.obo_printer_type === OboPrinterTypeEnum.adyen_printer;

  protected readonly isTicketProtection: Signal<boolean> = computed<boolean>(() =>
    isCancellationInsuranceSessionType(this.session().sessionType),
  );

  protected readonly isValidationHidden: Signal<boolean> = computed<boolean>(() => this.hiddenValidation() || this.isTicketProtection());

  protected readonly hasPrintTicketDisabled: Signal<boolean> = computed<boolean>(() => {
    return (
      this.isTicketProtection() ||
      this.#optimizelyService.isFeatureEnabled('do_not_print_tickets_after_selling') ||
      !this.#userService.hasPermission('can_reprint') ||
      !this.#hasTickets(this.session())
    );
  });

  protected readonly hasUnvalidateDisabled: Signal<boolean> = computed<boolean>(() => {
    return (
      this.isTicketProtection() ||
      !this.#userService.hasPermission(Permissions.CAN_UNVALIDATE_TICKET_CODES) ||
      !this.#hasTickets(this.session())
    );
  });
  hasBeenFullyTransferred: Signal<boolean> = computed<boolean>(() => this.session().hasBeenFullyTransferred());
  hasTransferIntentCodes: Signal<boolean> = computed<boolean>(
    () => this.session().ticketTransferIntents?.some(intent => intent.status === 'claimed' && intent.codes.length > 0) ?? false,
  );

  protected readonly splittablePackUnits: Signal<number> = computed<number>(() => CartUtil.getSplittablePackUnitCount(this.session()));

  protected readonly shouldShowSecondaryActions: Signal<boolean> = computed<boolean>(() =>
    this.#shouldShowSecondaryActions(this.session(), this.ticketsAndProducts(), this.hasBeenFullyTransferred()),
  );

  protected readonly cancellationInsurancePartnerShare: Signal<CancellationInsurancePartnerShare | null> =
    computed<CancellationInsurancePartnerShare | null>(() =>
      this.#userService.getUser()?.isStaff() === true ? null : (this.session().cancellationInsurancePartnerShare ?? null),
    );

  protected readonly shouldShowSessionReferencePrice: Signal<boolean> = computed<boolean>(
    () =>
      this.showReferencePrice() &&
      !this.hasLoyaltyPrice() &&
      this.cancellationInsurancePartnerShare() === null &&
      shouldShowReferencePrice(this.session().referencePrice?.total, this.session().total, this.session().referencePrice?.provenance),
  );
  validationStatusEnum = ValidationStatus;
  #selectedSessionCodeRows: Signal<Array<{ code: string; numericId: number }>> = computed(() => {
    if (!this.session().hasCodes) {
      return [];
    }
    const sessionIds = new Set(this.session().accessTicketIds ?? []);
    const selectedKeys = this.ticketSelection().selectedKeys();
    const tickets = this.ticketsAndProducts();
    const rows: Array<{ code: string; numericId: number }> = [];
    for (const id of sessionIds) {
      if (!selectedKeys.has(id)) {
        continue;
      }
      const code = tickets.get(id)?.code;
      if (!code) {
        continue;
      }
      const numericId = Number(id);
      if (Number.isNaN(numericId)) {
        continue;
      }
      rows.push({ code, numericId });
    }
    return rows;
  });
  selectedCodes: Signal<string[]> = computed<string[]>(() => this.#selectedSessionCodeRows().map(row => row.code));
  selectedCodeIds: Signal<number[]> = computed<number[]>(() => this.#selectedSessionCodeRows().map(row => row.numericId));
  protected readonly isUnvalidateSelectionEnabled: Signal<boolean> = computed<boolean>(() => {
    const rows = this.#selectedSessionCodeRows();
    if (rows.length === 0) {
      return false;
    }
    const tickets = this.ticketsAndProducts();
    return rows.every(row => this.#isPlanCodeValidated(tickets.get(String(row.numericId))));
  });
  #noCodeCount: WritableSignal<number> = signal<number>(0);
  selectedCount: Signal<number> = computed<number>(() => {
    if (this.session().hasCodes) {
      const sessionIds = this.session().accessTicketIds ?? [];
      const selectedKeys = this.ticketSelection().selectedKeys();
      return sessionIds.filter(id => selectedKeys.has(id)).length;
    }
    return this.#noCodeCount();
  });
  isATransferredTicket: Signal<boolean> = computed<boolean>(() => this.session().getTransfer() !== undefined);
  isAResoldTicket: Signal<boolean> = computed<boolean>(() => this.session().getTransfer()?.transferType === TransferTypeEnum.RESALE);
  isPrinting: WritableSignal<boolean> = signal<boolean>(false);
  checkInDetails: Signal<CheckInDetails | null> = computed<CheckInDetails | null>(
    () => this.ticketsAndProducts()?.values()?.next()?.value?.checkInDetails ?? null,
  );
  checkInStatus: Signal<CheckInStatus | null> = computed<CheckInStatus | null>(() => this.#getCheckInStatus(this.checkInDetails()));
  isMobile: Signal<boolean> = inject(BreakpointStateService).getStateProp('isMobile');
  canBeValidated: Signal<boolean> = computed<boolean>(() => this.#canBeValidated(this.session()));
  protected readonly isPackConstituent: Signal<boolean> = computed<boolean>(() => this.session().isPackConstituent);
  protected readonly isInactive: Signal<boolean> = computed<boolean>(
    () => this.showsCoveredByFeverAsInactive() && this.session().status === ValidationStatus.CANCELLED,
  );
  nonCancelledTicketsCount: Signal<number> = computed<number>(() =>
    this.#getNonCancelledTicketCount(this.session(), this.ticketsAndProducts()),
  );

  sentimentTag: Record<string, TagSentiment> = {
    active: 'positive',
    cancelled: 'danger',
    completed: 'positive',
    null: 'disable',
    pending: 'warning',
    transferred: 'positive',
  } as const;
  readonly Permissions = Permissions;
  locale: string | undefined;

  isValidationHistoryVisible = signal<boolean>(false);
  selectedCode = signal<string>('');

  hasReassignEnabled: Signal<boolean> = computed<boolean>(
    () =>
      (this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.REASSIGN_SEATS_FROM_ORDERS, team: 'b2b-onsite' }) ??
        false) &&
      !!this.session().seats?.length,
  );

  getPendingValidationStatusString(): string {
    return `${this.selectedCount()}/${this.nonCancelledTicketsCount()}`;
  }

  goToTicket(ticketId: number): void {
    this.action.emit({
      action: OrderAction.GO_TO_TICKET,
      data: {
        ticketId: ticketId,
      },
    });
  }

  hideValidationHistory(): void {
    this.isValidationHistoryVisible.set(false);
    this.selectedCode.set('');
  }

  onTicketUpdated(): void {
    this.action.emit({ action: OrderAction.TICKET_UPDATED });
  }

  openResendModal(): void {
    if (this.session().status === ValidationStatus.CANCELLED) {
      return;
    }

    const ticketId: number = this.session().ticketId ?? 0;
    this.action.emit({
      action: OrderAction.OPEN_RESEND_MODAL,
      data: {
        ticketId: ticketId,
      },
    });
  }

  printTicket(): void {
    if (this.session().status === ValidationStatus.CANCELLED) {
      return;
    }

    this.isPrinting.set(true);
    this.action.emit({
      action: OrderAction.PRINT_TICKET,
      data: {
        ticketId: this.session().ticketId,
      },
    });

    this.actionResolvedEvent()?.subscribe(({ action }) => {
      if (action === OrderAction.PRINT_TICKET || action === OrderAction.PRINT_ORDER) {
        this.isPrinting.set(false);
      }
    });
  }

  reassignSeats(): void {
    if (this.session().status === ValidationStatus.CANCELLED) {
      return;
    }

    this.action.emit({
      action: OrderAction.REASSIGN_SEATS,
      data: {
        ticketId: this.session().ticketId,
      },
    });
  }

  selectAllForSession(selected: boolean): void {
    const sessionIds = this.session().accessTicketIds ?? [];
    if (selected) {
      this.ticketSelection().selectSubset(sessionIds);
    } else {
      this.ticketSelection().deselectSubset(sessionIds);
    }
  }

  selectCount(count: number): void {
    this.#noCodeCount.set(count);
  }

  showValidationHistory(code: string): void {
    this.selectedCode.set(code);
    this.isValidationHistoryVisible.set(true);
  }

  splitPack(): void {
    if (this.session().status === ValidationStatus.CANCELLED) {
      return;
    }
    if (this.splittablePackUnits() < 1) {
      return;
    }

    this.action.emit({
      action: OrderAction.SPLIT_PACK,
      data: {
        ticketId: this.session().ticketId,
      },
    });
  }

  toggleIsCollapse(): void {
    this.isCollapsedChange.emit(!this.isCollapsed());
  }

  unvalidateCodes(): void {
    if (this.session().status === ValidationStatus.CANCELLED) {
      return;
    }

    this.action.emit({
      action: OrderAction.UNVALIDATE_CODES,
      data: {
        codeIds: this.selectedCodeIds(),
        codes: this.selectedCodes(),
        ticketCount: this.nonCancelledTicketsCount(),
        ticketId: this.session().ticketId,
      },
    });
  }

  validateSelection(): void {
    const ticketId = this.session().ticketId;
    const onsiteSetup = this.#onsiteSetupsStorageService.getConfiguration();
    const profileIds = onsiteSetup?.validation_profiles ?? [];
    const setupId = onsiteSetup?.access_control_setup_id ?? null;
    const hasSelectedCodes = (this.selectedCodes()?.length ?? 0) > 0;

    if (hasSelectedCodes) {
      this.action.emit({
        action: OrderAction.VALIDATE_CODE,
        data: {
          codes: this.selectedCodes(),
          profileIds: profileIds,
          setupId: setupId,
        },
      });
    } else if (this.selectedCount() > 0) {
      this.action.emit({
        action: OrderAction.VALIDATE_TICKET,
        data: {
          ticketCount: this.selectedCount(),
          ticketId: ticketId,
        },
      });
    }
  }

  #canBeValidated(session: CartSession): boolean {
    const partnerId = this.#partnerService.getPartner()?.id?.toString();
    if (!partnerId) return false;

    const allowsMultipleValidations =
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.FZ_ALLOW_MULTIPLE_VALIDATIONS, {
        partner_id: partnerId,
      }) ?? false;

    const allTicketsValidated: boolean = (session.units && session.validatedCount === session.accessTicketIds?.length) || false;
    const isEntryPass: boolean = session.sessionType?.isEntryPass || false;
    const hasValidationProfiles: boolean = this.#getConfiguredValidationProfileIds().length > 0;
    return allowsMultipleValidations || !allTicketsValidated || isEntryPass || hasValidationProfiles;
  }

  #getConfiguredValidationProfileIds(): string[] {
    return this.#onsiteSetupsStorageService.getConfiguration()?.validation_profiles ?? [];
  }

  #isPlanCodeValidated(ticket: AccessTicket | undefined): boolean {
    if (!ticket) {
      return false;
    }
    return Boolean(ticket.redeemedAt || ticket.isValidated);
  }

  #getCheckInStatus(checkInDetails: CheckInDetails | null): CheckInStatus | null {
    if (checkInDetails === null) {
      return null;
    }
    return checkInDetails?.completedAt ? CheckInStatus.COMPLETED : CheckInStatus.PENDING;
  }

  #getNonCancelledTicketCount(session: CartSession, ticketsAndProducts: Map<string, AccessTicket>): number {
    return Array.from(ticketsAndProducts?.values() ?? []).filter(
      ticket =>
        ticket.status !== ValidationStatus.CANCELLED &&
        ticket.status !== ValidationStatus.TRANSFERRED &&
        ticket.ticketId === session?.ticketId,
    ).length;
  }

  #hasTickets(session: CartSession): boolean {
    return !!session.ticketId;
  }

  #shouldShowSecondaryActions(
    session: CartSession,
    ticketsAndProducts: Map<string, AccessTicket>,
    hasBeenFullyTransferred: boolean,
  ): boolean {
    const isFakeTicket = Array.from(ticketsAndProducts?.values() ?? []).some(ticket => ticket.ticketId === FAKE_IDS.FAKE_TICKET_ID);
    const isCancelled = session.status === this.validationStatusEnum.CANCELLED;
    const isSessionEnded = session.sessionEndAt ? moment(session.sessionEndAt).isBefore(moment()) : false;
    return !isFakeTicket && !isCancelled && !isSessionEnded && !hasBeenFullyTransferred;
  }

  protected hasLoyaltyPrice(): boolean {
    return isNonZeroNumber(this.sessionLoyaltyTotal());
  }

  protected sessionLoyaltyUnitPrice(): number {
    return this.session().loyaltyUnitPrice ?? 0;
  }

  protected sessionLoyaltyTotal(): number {
    return this.session().loyaltyTotalPrice ?? 0;
  }
}
