import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { OrderCancellationHistoryTimelineItem } from '@fz-original/app/shared/components/order/components/order-history-panel/order-cancellation-history-timeline-item.model';
import { RefundDetailsSummary } from '@fz-original/app/shared/components/order/components/order-history-panel/refund-details-summary.model';
import { UserNotificationSummary } from '@fz-original/app/shared/components/order/components/order-history-panel/user-notification-summary.model';
import {
  hasCancellationInsuranceComment,
  isCoveredByCancellationInsurance,
} from '@fz-original/app/shared/components/order/utils/order-cancellation-insurance.util';
import {
  buildCancellationCouponSummaries,
  buildCompensationCouponSummaries,
  getDepositRefundRecordIndex,
  getOrderDepositRefundedAmount,
} from '@fz-original/app/shared/components/order/utils/order-cancellation-refund.util';
import { Deposit } from '@fz-original/app/shared/models/deposit/deposit.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { ReimbursementType } from '@fz-original/app/shared/models/order/reimbursement-type.enum';
import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ExpandOrderHistoryCancellationRecordEvent } from '../../../../../core/tracking/core/events/expand-order-history-cancellation-record';
import { TrackingService } from '../../../../../core/tracking/tracking.service';
import { OrderCancelledTicketRecord, OrderUserCancellationRecord } from '../../../../models/order/order-cancellation-record.model';
import { PipesModule } from '../../../../pipes/pipes.module';
import { TimelineItemContentDirective } from '../../../timeline/directives/timeline-item-content.directive';
import { TimelineItemExpandedWithContextEvent, TimelineItemModel } from '../../../timeline/models/timeline-item.model';
import { TimelineComponent } from '../../../timeline/timeline.component';

type SectionName = 'refundDetails' | 'tickets' | 'userNotification';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FontAwesomeModule, IgntAlertComponent, PipesModule, TimelineComponent, TimelineItemContentDirective, TranslateModule],
  selector: 'app-order-history-panel',
  standalone: true,
  styleUrls: ['./order-history-panel.component.scss'],
  templateUrl: './order-history-panel.component.html',
})
export class OrderHistoryPanelComponent {
  static readonly cancellationIcon: IconProp = ['fas', 'times'];
  static readonly chevronDown: IconProp = ['fal', 'chevron-down'];
  static readonly chevronUp: IconProp = ['fal', 'chevron-up'];
  static readonly inactiveIcon: IconProp = ['fas', 'minus'];
  static readonly orderHistoryTemplateKey = 'order_history_record';
  static readonly refundIcon: IconProp = ['fal', 'receipt'];
  static readonly ticketsIcon: IconProp = ['fal', 'ticket'];
  static readonly unknownFieldValue = '-';
  static readonly userNotificationIcon: IconProp = ['fal', 'user'];

  readonly #trackingService = inject(TrackingService);
  readonly #translate = inject(TranslateService);

  readonly #sectionExpanded = signal<Record<string, Record<string, boolean>>>({});

  readonly deposit = input<Deposit | null>(null);
  readonly isSuperuser = input<boolean>(false);
  readonly orderId = input<number>();
  readonly originalPurchaser = input<string>();
  readonly userCancellationRecords = input<OrderUserCancellationRecord[]>([]);

  protected readonly ReimbursementType = ReimbursementType;

  protected asOrderCancellationHistoryItem(item: TimelineItemModel): OrderCancellationHistoryTimelineItem {
    return item as OrderCancellationHistoryTimelineItem;
  }

  readonly timelineItems = computed<OrderCancellationHistoryTimelineItem[]>(() => {
    const records = this.userCancellationRecords();
    const deposit = this.deposit();
    const depositRefundAmount = getOrderDepositRefundedAmount(records, deposit);
    const depositRefundRecordIndex = depositRefundAmount != null ? getDepositRefundRecordIndex(records, deposit) : -1;

    return records.map((record, index) => {
      const isCoveredByFever = !record.isPartnerVisible;
      const showsNeutralReason = isCoveredByFever && !this.isSuperuser();
      return {
        cancellationCouponType: record.cancellationCouponType,
        cancellationReason: record.cancellationReason,
        partnerCancellationReason: record.partnerCancellationReason,
        refundReason: record.refundReason,
        comments: this.#parseComment(record.comments),
        hasCancellationInsuranceComment: hasCancellationInsuranceComment(record),
        isCoveredByCancellationInsurance: isCoveredByCancellationInsurance(record),
        isCoveredByFever,
        isPostCancellationRefund: record.isPostCancellationRefund,
        showsNeutralReason,
        contentTemplateKey: OrderHistoryPanelComponent.orderHistoryTemplateKey,
        datetime: record.createdAt,
        icon: showsNeutralReason ? OrderHistoryPanelComponent.inactiveIcon : OrderHistoryPanelComponent.cancellationIcon,
        iconSentiment: showsNeutralReason ? 'default' : 'failed',
        id: `${record.id}-${index}`,
        refundDetailsSummary: this.#buildRefundDetailsSummary(
          record,
          index === depositRefundRecordIndex ? depositRefundAmount : null,
          deposit?.refundedAt ?? null,
        ),
        reimbursementType: record.reimbursementType,
        requesterEmail: record.requesterEmail,
        ticketsSummary: record.cancelledTickets.map(ticket => ({
          count: ticket.count,
          label: ticket.label,
          ticketId: ticket.ticketId,
          email: ticket.ticketOwner?.email ?? '',
        })),
        allTicketsHaveSameOwner: this.#buildAllTicketsHaveSameOwner(record.cancelledTickets),
        title: this.#translate.instant(showsNeutralReason ? 'common.inactive' : 'validateTicketsNew.orderHistory.timeline.cancellation'),
        userNotificationsSummary: this.#buildUserNotificationsSummary(record),
      };
    });
  });

  protected readonly localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  protected get currentLocale(): string {
    return this.#translate.currentLang;
  }

  #buildRefundDetailsSummary(
    record: OrderUserCancellationRecord,
    depositRefundAmount: Money | null,
    depositRefundedAt: string | null,
  ): RefundDetailsSummary | null {
    const cancellationCoupons = buildCancellationCouponSummaries(record.cancelledTickets);
    const compensationCoupons = buildCompensationCouponSummaries(record.cancelledTickets);

    const canRenderMoneyRefund = record.refundedAmount != null && record.refundedAt != null;
    const allRefundOptionsAreEmpty =
      cancellationCoupons.length === 0 && compensationCoupons.length === 0 && !canRenderMoneyRefund && depositRefundAmount == null;

    if (allRefundOptionsAreEmpty) {
      return null;
    }

    return {
      cancellationCoupons,
      compensationCoupons,
      depositRefundAmount,
      depositRefundedAt,
      refundAmount: record.refundedAmount,
      refundedAt: record.refundedAt,
    };
  }

  #buildUserNotificationsSummary(record: OrderUserCancellationRecord): UserNotificationSummary[] {
    const seenEmails = new Set<string>();

    return record.cancelledTickets
      .filter(ticket => ticket.shouldNotify)
      .map(ticket => ({
        email: ticket.ticketOwner?.email ?? '',
        firstName: ticket.ticketOwner?.firstName ?? '',
        lastName: ticket.ticketOwner?.lastName ?? '',
        notifiedAt: ticket.notifiedAt,
      }))
      .filter(summary => {
        if (seenEmails.has(summary.email)) {
          return false;
        }
        seenEmails.add(summary.email);
        return true;
      });
  }

  #buildAllTicketsHaveSameOwner(tickets: OrderCancelledTicketRecord[]): boolean {
    if (tickets.length === 0) {
      return true;
    }

    return tickets.every(ticket => ticket.ticketOwner?.email === tickets[0].ticketOwner?.email);
  }

  #parseComment(comments: string | undefined): string {
    const normalizedComments = comments?.trim() ?? '';
    const splitComments = normalizedComments.split('|').map(item => item.trim());

    if (normalizedComments.includes('|') && splitComments.length >= 3) {
      return splitComments.slice(2).join(' | ').trim() || OrderHistoryPanelComponent.unknownFieldValue;
    }

    return normalizedComments || OrderHistoryPanelComponent.unknownFieldValue;
  }

  protected chevronIcon(expanded: boolean): IconProp {
    return expanded ? OrderHistoryPanelComponent.chevronUp : OrderHistoryPanelComponent.chevronDown;
  }

  protected isSectionExpanded(itemId: string, section: SectionName): boolean {
    return this.#sectionExpanded()[itemId]?.[section] ?? true;
  }

  protected toggleItemSection(itemId: string, section: SectionName): void {
    this.#sectionExpanded.update(state => ({
      ...state,
      [itemId]: {
        ...state[itemId],
        [section]: !(state[itemId]?.[section] ?? true),
      },
    }));
  }

  protected onItemExpanded(event: TimelineItemExpandedWithContextEvent): void {
    if (!event.isExpanded) {
      return;
    }

    const orderHistoryItem = event.item as OrderCancellationHistoryTimelineItem;
    const orderId = this.orderId();

    if (orderId === undefined) {
      return;
    }

    this.#trackingService.track(
      new ExpandOrderHistoryCancellationRecordEvent({
        order_id: orderId,
        cancellation_record_reason: orderHistoryItem.cancellationReason ?? '',
        cancellation_record_index: event.index,
      }),
    );
  }
}
