import { Injectable } from '@angular/core';

import { EntitlementType } from '@fz-original/app/entitlements/models/entitlement.model';
import {
  BreakdownItem,
  CancellableItem,
  CancellableItemValidationStatus,
  TicketSummary,
} from '@fz-original/app/modules/cancellation/models/ticket-summary.model';
import { BookingQuestionNominativeTicketConfiguration } from '@fz-original/app/shared/booking-questions/models/booking-question-nominative-ticket-configuration';
import {
  CartAdjustmentPrice,
  CartAdjustmentPriceCalculationFinal,
  CartAdjustmentPriceWithOperationData,
} from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import { TicketMainStatus } from '@fz-original/app/shared/components/order/components/order-tickets/order-ticket/ticket-main-status.enum';
import { FEVER_BACKOFFICE_INVITATION_DISPLAY_NAME } from '@fz-original/app/shared/models/channel/channel-display-name.const';
import { InvitationOwner } from '@fz-original/app/shared/models/invitation/invitation-owner.enum';
import { InvitationSource } from '@fz-original/app/shared/models/invitation/invitation-source.enum';
import { isReimbursementType } from '@fz-original/app/shared/models/order/reimbursement-type.enum';
import { User } from '@fz-original/app/shared/models/user/user.model';
import moment from 'moment-timezone';

import { AdapterInterface } from '../../../core/adapter.interface';
import { PaymentType } from '../../../modules/box-office/checkout/models/payment-type.enum';
import { ValidationMethod } from '../../../modules/event-settings/models/validation-section.enum';
import { ValidationStatus } from '../../../modules/validation/enums/validation-status.enum';
import { AssignedSeat, TicketCode } from '../../components/order/components/order-tickets/order-ticket/order-ticket.model';
import { BookingQuestionTypeEnum } from '../../models/booking-questions/booking-question-type.enum';
import { BookingQuestion } from '../../models/booking-questions/booking-question.model';
import { CartSession, CartSessionAdjustmentPrice } from '../../models/cart/cart-session.model';
import { TicketTransfer } from '../../models/cart/cart-ticket-transfer.model';
import { Cart } from '../../models/cart/cart.model';
import { DiscountPaidBy } from '../../models/cart/discount-paid-by.enum';
import { TransferIntent, TransferIntentStatus } from '../../models/cart/transfer-intent.model';
import { TransferTypeEnum } from '../../models/cart/transfer-type.enum';
import { Channel } from '../../models/channel/channel.model';
import { journeyFromDto } from '../../models/journey/journey.adapter';
import { IMoney, Money } from '../../models/money.model';
import { orderPendingModificationFromDto } from '../../models/order-pending-modification/order-pending-modification.adapter';
import { AccessTicket } from '../../models/order/access-ticket.model';
import { CancellationInsurancePartnerShare } from '../../models/order/cancellation-insurance-partner-share.model';
import { CatalogPlan } from '../../models/order/catalog-plan.model';
import { CodeType } from '../../models/order/code-type.model';
import { EntitlementsInfo } from '../../models/order/entitlements-info.model';
import { mapFiscalLinesFromApi } from '../../models/order/fiscal-line.model';
import { OrderCancelledTicketRecord, OrderUserCancellationRecord } from '../../models/order/order-cancellation-record.model';
import { OrderChannelType } from '../../models/order/order-channel-type.model';
import { OrderTaxes } from '../../models/order/order-taxes.model';
import { Order } from '../../models/order/order.model';
import { ReferencePrice, referencePriceProvenances } from '../../models/order/reference-price.model';
import { TicketReleaseCondition } from '../../models/order/release-condition.model';
import { Spot } from '../../models/order/spot.model';
import { TicketTimeGranularity } from '../../models/order/ticket-time-granularity.enum';
import { SessionType, SessionTypeAddOnConfiguration } from '../../models/session-type/session-type.model';
import { Channel as ChannelId } from '../../services/session-availability/channel.enum';
import { AddOnCategory } from '../../services/sessions/session-type.model';
import { CartUtil } from '../../utils/cart.util';
import {
  AssignedSeatDTO,
  BookingAnswerDTO,
  BookingQuestionDTO,
  CancelledTicketDTO,
  InvitationDTO,
  OrderAddOnConfigurationDTO,
  OrderDTO,
  OrderProductServingTimeDTO,
  OrderTaxesDTO,
  ReleaseConditionDTO,
  SerializedAssignedSeatDTO,
  SerializedBreakdownItemDTO,
  SerializedCancellableItemDTO,
  SerializedCodeDTO,
  SessionTypeDTO,
  TicketDTO,
  TicketSummaryDTO,
  TicketTransferDTO,
  TicketTransferIntentDTO,
  UserCancellationRecordDTO,
  UserTicketDTO,
} from './models/orders.dto';

const DomaVaqueraPlanId = 259843;
const MadridHorseWeekID = 258850;

@Injectable({
  providedIn: 'root',
})
export class OrderAdapter implements AdapterInterface<Order> {
  #getAccessGateLabel = (gates: string): string => {
    const prefixAccessLabel = 'Accesos del';
    return `${prefixAccessLabel} ${gates}, `;
  };

  fromApi(order: OrderDTO): Order {
    if (!order.tickets) {
      return new Order({
        hasAssetBasedBooking: order.has_asset_based_booking,
        hasPartySummary: order.has_party_summary,
        journey: order.journey ? journeyFromDto(order.journey) : undefined,
        id: order.id,
        isFlexibleBundlePrimary: order.is_flexible_bundle_primary,
        isMainGroupOrder: order.is_main_group_order ?? null,
        purchaseUrn: order.purchase_urn,
        mainOrderId: order.main_order_id,
        orderGroupId: order.order_group_id ?? undefined,
        loyaltyPoints: order.loyalty?.amount,
        externalId: order.external_id,
        externalOrderCode: order.external_order_code ?? undefined,
        externalOrderId: order.external_order_id ?? undefined,
        planProviderName: order.plan?.provider_name ?? null,
        validationMethod: Object.values(ValidationMethod).includes(order.validation_method as ValidationMethod)
          ? (order.validation_method as ValidationMethod)
          : ValidationMethod.NO_VALIDATION,
      });
    }
    const { cart, accessTickets, products, ticketsAndProducts } = this.#getOrderDetails(order);
    return new Order({
      accessTickets,
      assignedSeatsIds: this.#getAssignedSeatsIds(order.tickets),
      bundleDiscount: Money.fromData(order.bundle_discount) ?? undefined,
      cart,
      catalogPlan: this.#mapCatalogPlan(order.catalog_plan),
      entitlementsInfo: this.#mapEntitlementsInfo(order.entitlements_info),
      externalId: order.external_id,
      externalOrderCode: order.external_order_code ?? undefined,
      externalOrderId: order.external_order_id ?? undefined,
      groupedOrders: order.grouped_orders?.length ? [...order.grouped_orders] : undefined,
      groupMemberCount: order.group_member_count,
      groupMembers: this.#mapGroupMembers(order.group_members),
      hasAssetBasedBooking: order.has_asset_based_booking,
      hasDeposit: order.has_deposit,
      hasPartySummary: order.has_party_summary,
      hasShopsEntitlement: this.#hasShopsEntitlement(order.tickets),
      id: order.id,
      journey: order.journey ? journeyFromDto(order.journey) : undefined,
      isFlexibleBundlePrimary: order.is_flexible_bundle_primary,
      isMainGroupOrder: order.is_main_group_order ?? null,
      purchaseUrn: order.purchase_urn,
      mainOrderId: order.main_order_id,
      orderGroupId: order.order_group_id ?? undefined,
      loyaltyPoints: order.loyalty?.amount,
      products,
      ticketsAndProducts,
      termsAndConditionsQrImage: order.plan.terms_and_conditions_qr_image ?? undefined,
      placeId: order.tickets.at(0)?.session.place.id ?? undefined,
      planId: order.plan.id,
      planName: order.plan.name,
      planProviderName: order.plan.provider_name ?? null,
      coverImageUrl: order.plan.cover_image_url,
      ticketPrinter: order.ticket_printer,
      ticketSizeType: order.ticket_size_type,
      channelId: this.#getDisplayChannelId(order),
      channelType: this.#getChannelType(order),
      paymentCardNumberLast4Digits: order.payment_card_number_last_4_digits,
      paymentGateway: order.payment_gateway,
      paymentMethod: order.payment_method as PaymentType,
      bookingQuestions: order.booking_questions
        ? order.booking_questions.map(
            bookingQuestion =>
              new BookingQuestion(
                bookingQuestion.id,
                bookingQuestion.label,
                bookingQuestion.message,
                (bookingQuestion.type as BookingQuestionTypeEnum) ?? null,
                bookingQuestion.choices,
              ),
          )
        : undefined,
      bookingAnswers: order.booking_answers
        ? order.booking_answers.map(bookingAnswer => ({
            id: bookingAnswer.id,
            bookingQuestionId: bookingAnswer.booking_question_id,
            mainPlanId: bookingAnswer.main_plan_id ?? null,
            ticketIndex: bookingAnswer.ticket_index,
            value: bookingAnswer.value,
            codeId: bookingAnswer.code_id,
          }))
        : undefined,
      allowsPartialCancellation: order.allows_partial_cancellation,
      allowSplitPack: order.plan.is_pack_split_allowed,
      status: order.status,
      externalReservationId: order.external_reservation_id,
      originChannelId: order.origin_channel_id,
      pendingModification: orderPendingModificationFromDto(order.pending_modification),
      reservationId: order.reservation_id,
      reservationLocator: order.reservation_locator,
      reservationChannelId: order.reservation_channel_id,
      createdAt: order.created_at,
      note: order.note
        ? {
            id: order.note.id,
            title: order.note.title,
            message: order.note.message,
            userId: order.note.user_id,
            username: order.note.username,
            modifiedAt: order.note.modified_at,
            createdAt: order.note.created_at,
          }
        : undefined,
      paymentNote: order.payment_note
        ? {
            id: order.payment_note.id,
            title: order.payment_note.title,
            message: order.payment_note.message,
            userId: order.payment_note.user_id,
            username: order.payment_note.username,
            modifiedAt: order.payment_note.modified_at,
            createdAt: order.payment_note.created_at,
          }
        : undefined,
      servingTimesBySessionId: this.#buildServingTimesBySessionId(order),
      sessionSelectorType: order.plan.session_selector_type,
      sourceRescheduleOrderId: order.source_reschedule_order_id,
      targetRescheduleOrderIds: order.target_reschedule_order_ids?.length ? [...order.target_reschedule_order_ids] : undefined,
      taxes: order.taxes ? this.#getTaxInformation(order.taxes, order.total.currency) : undefined,
      ticketsSummaries: order.tickets_summaries ? this.#mapTicketsSummaries(order.tickets_summaries) : undefined,
      userCancellationRecords: order.user_cancellation_records
        ? this.#mapUserCancellationRecords(order.user_cancellation_records)
        : undefined,
      validationMethod:
        order.validation_method && Object.values(ValidationMethod).includes(order.validation_method as ValidationMethod)
          ? (order.validation_method as ValidationMethod)
          : ValidationMethod.NO_VALIDATION,
      allowedReimbursementTypes: order.allowed_reimbursement_types?.filter(isReimbursementType),
      user: this.#getOrderUser(order.user),
    });
  }

  #buildServingTimesBySessionId(order: OrderDTO): ReadonlyMap<number, string> | undefined {
    const servingTimes = new Map<number, string>(
      (order.product_serving_times ?? []).flatMap(
        (servingTime: OrderProductServingTimeDTO): Array<[number, string]> =>
          servingTime.serving_at != null ? [[servingTime.session_id, servingTime.serving_at]] : [],
      ),
    );
    return servingTimes.size > 0 ? servingTimes : undefined;
  }

  #addAccessSeats(seat: string, planId: number): string {
    let numberOfSeat: number;
    let accessName: string;
    if ([DomaVaqueraPlanId, MadridHorseWeekID].includes(planId)) {
      numberOfSeat = Number.parseInt(seat.split(',')[2], 10);
      accessName = this.#getAccessName(numberOfSeat, planId);
      return accessName + seat;
    }
    return seat;
  }

  #calculateIsExpired(expirationDate: string): boolean {
    return moment(new Date(expirationDate)).isBefore(moment());
  }

  #getAccessName(seat: number, planId: number): string {
    switch (planId) {
      case MadridHorseWeekID:
        return this.#getAccessNameForMadridHorseWeek(seat);
      case DomaVaqueraPlanId:
        return this.#getAccessNameForDomaVaquera(seat);
      default:
        return '';
    }
  }

  #getAssignedSeatsIds(tickets: TicketDTO[]): Array<{ seatsIds: number[]; ticketId: number }> {
    return tickets.map(ticket => ({
      seatsIds: ticket.assigned_seats?.map(seat => seat.id) ?? [],
      ticketId: ticket.id,
    }));
  }

  #getAccessNameForDomaVaquera(seat: number): string {
    if (seat >= 1 && seat < 57) {
      return this.#getAccessGateLabel('1 al 3');
    }
    if (seat >= 57 && seat < 114) {
      return this.#getAccessGateLabel('4 al 6');
    }
    if (seat >= 114 && seat < 160) {
      return this.#getAccessGateLabel('7 y 8');
    }
    return '';
  }

  #getAccessNameForMadridHorseWeek(seat: number): string {
    if (seat >= 1 && seat < 58) {
      return this.#getAccessGateLabel('1 al 3');
    }
    if (seat >= 58 && seat < 108) {
      return this.#getAccessGateLabel('4 al 7');
    }
    if (seat >= 108 && seat < 171) {
      return this.#getAccessGateLabel('8 y 9');
    }
    if (seat >= 171 && seat < 231) {
      return this.#getAccessGateLabel('10 y 11');
    }
    return '';
  }

  #getAssignedSeatsByCodeId(session: TicketDTO): Map<number, AssignedSeatDTO> {
    const assignedSeatsByCodeId = new Map<number, AssignedSeatDTO>();

    for (const assignedSeat of session.assigned_seats ?? []) {
      if (assignedSeat.code_id != null && !assignedSeatsByCodeId.has(assignedSeat.code_id)) {
        assignedSeatsByCodeId.set(assignedSeat.code_id, assignedSeat);
      }
    }

    return assignedSeatsByCodeId;
  }

  #getSeatAssignmentForCodeId(
    assignedSeatsByCodeId: Map<number, AssignedSeatDTO>,
    session: TicketDTO,
    codeId: number,
    planId: number,
    positionalIndex: number | undefined,
  ): { seat?: string; seatId?: number } {
    const assignedSeatByCodeId = assignedSeatsByCodeId.get(codeId);
    if (assignedSeatByCodeId != null) {
      return {
        seat: this.#addAccessSeats(assignedSeatByCodeId.label, planId),
        seatId: assignedSeatByCodeId.id,
      };
    }

    if (positionalIndex !== undefined && session.seats?.length > 0) {
      return {
        seat: this.#addAccessSeats(session.seats[positionalIndex], planId),
        seatId: session.assigned_seats?.[positionalIndex]?.id,
      };
    }

    return {};
  }

  #getAccessTicketInformation(
    session: TicketDTO,
    order: OrderDTO,
  ): {
    accessTicketIds: string[];
    accessTicketMap: Map<string, AccessTicket>;
  } {
    const planId = order.plan.id;
    const bookingAnswers = order.booking_answers ?? [];
    const bookingQuestions = order.booking_questions ?? [];
    const accessTicketIds: string[] = [];
    const accessTicketMap: Map<string, AccessTicket> = new Map();
    const isTransactionFee =
      this.#getAddOnConfiguration(session.session.session_type?.add_on_configuration)?.category === AddOnCategory.transactionFee;
    if (session.codes?.length > 0) {
      const assignedSeatsByCodeId = this.#getAssignedSeatsByCodeId(session);
      let activeSeatIndex = 0;
      session.codes.forEach(sessionCode => {
        accessTicketIds.push(sessionCode.id.toString());
        const isActiveCode = sessionCode.status !== ValidationStatus.CANCELLED;
        const activeSeatIndexForAssignedSeats = isActiveCode ? activeSeatIndex : undefined;
        if (isActiveCode) {
          activeSeatIndex++;
        }
        const seatAssignment = isActiveCode
          ? this.#getSeatAssignmentForCodeId(assignedSeatsByCodeId, session, sessionCode.id, planId, activeSeatIndexForAssignedSeats)
          : {};
        const accessTicket: AccessTicket = {
          id: sessionCode.id.toString(),
          ticketId: session.id,
          total:
            session.total_price_per_ticket && session.total_price_per_ticket.amount !== null && session.total_price_per_ticket.currency
              ? new Money(session.total_price_per_ticket.amount, session.total_price_per_ticket.currency)
              : new Money(0, ''),
          unitPrice:
            session.unit_price && session.unit_price.amount !== null && session.unit_price.currency
              ? new Money(session.unit_price.amount, session.unit_price.currency)
              : new Money(0, ''),
          surchargePerTicket:
            session.surcharge_per_ticket && session.surcharge_per_ticket.amount !== null && session.surcharge_per_ticket.currency
              ? new Money(session.surcharge_per_ticket.amount, session.surcharge_per_ticket.currency)
              : new Money(0, ''),
          sessionName: session.session.title,
          sessionPlaceName: session.session.place?.name,
          sessionTicketReceiptLabel: session.session.session_type?.ticket_receipt_label,
          sessionAddress: session.session.place.address,
          sessionStartsAt: session.session.starts_at,
          sessionIsoCountryCode: session.session.place.city.iso_code,
          timeGranularity: this.#getTicketTimeGranularity(session.time_granularity),
          code: sessionCode.code,
          sessionLabel: sessionCode.session_label,
          codeType: sessionCode.type as CodeType,
          imageUrl: sessionCode.image_url ?? null,
          seat: seatAssignment.seat,
          status: sessionCode.status as ValidationStatus,
          isValidated: sessionCode.is_validated,
          redeemedAt: sessionCode.redeemed_at ?? undefined,
          discountApplied: session.discount_per_each_access_ticket
            ? new Money(session.discount_per_each_access_ticket?.amount, session.total_price_per_ticket.currency)
            : null,
          isInvitation: Boolean(session.invitation),
          isTransactionFee,
          checkInDetails: session.check_in_details
            ? { isAvailable: session.check_in_details.is_available, completedAt: session.check_in_details.completed_at }
            : null,
          seatId: seatAssignment.seatId,
          invitationId: session.invitation?.id ?? null,
          nominativeValues: this.#getNominativeValues(sessionCode.id, bookingAnswers, bookingQuestions),
          holderName: this.#getTicketHolderName(sessionCode.id, bookingAnswers, bookingQuestions),
          expiryDate: sessionCode.validity?.expiry_date ?? undefined,
          activationDate: sessionCode.validity?.activation_date ?? undefined,
          sessionOpenGatesAt: session.session.open_gates_at ?? undefined,
          showInvitationLabel: this.#getIsInvitationForPdf(session.invitation),
          spot: this.#getSpot(session.session.session_type?.spot_category_label, sessionCode.spot_label),
          taxRate: session.tax_rate ?? undefined,
          fiscalLines: mapFiscalLinesFromApi(session.fiscal_lines),
          groupId: session.group_id,
          surchargeTaxRate: session.surcharge_tax_rate_national ?? undefined,
          productType: session.product_type ?? undefined,
          loyaltyUnitPrice: session.loyalty_price?.unit_amount ?? undefined,
          loyaltyTotalPrice: session.loyalty_price?.total_amount ?? undefined,
          hasReleaseConditions: session.has_release_conditions,
          releaseCondition: this.#mapReleaseCondition(session.release_condition),
        };
        accessTicketMap.set(sessionCode.id.toString(), accessTicket);
      });
    } else {
      for (let ticket = 1; ticket <= session.units; ticket++) {
        const accessTicketId = `${session.id}-${ticket}`;
        const accessTicket: AccessTicket = {
          id: accessTicketId,
          ticketId: session.id,
          total:
            session.total_price_per_ticket && session.total_price_per_ticket.amount !== null && session.total_price_per_ticket.currency
              ? new Money(session.total_price_per_ticket.amount, session.total_price_per_ticket.currency)
              : new Money(0, ''),
          unitPrice:
            session.unit_price && session.unit_price.amount !== null && session.unit_price.currency
              ? new Money(session.unit_price.amount, session.unit_price.currency)
              : new Money(0, ''),
          surchargePerTicket:
            session.surcharge_per_ticket && session.surcharge_per_ticket.amount !== null && session.surcharge_per_ticket.currency
              ? new Money(session.surcharge_per_ticket.amount, session.surcharge_per_ticket.currency)
              : new Money(0, ''),
          sessionName: session.session.title,
          sessionPlaceName: session.session.place?.name,
          sessionTicketReceiptLabel: session.session.session_type?.ticket_receipt_label,
          sessionAddress: session.session.place.address,
          sessionStartsAt: session.session.starts_at,
          sessionIsoCountryCode: session.session.place.city.iso_code,
          timeGranularity: this.#getTicketTimeGranularity(session.time_granularity),
          codeType: null,
          seat: session.seats?.length > 0 ? session.seats[ticket - 1] : undefined,
          status: session.status as ValidationStatus,
          isValidated: ticket <= session.validated_count,
          discountApplied: session.discount_per_each_access_ticket
            ? new Money(session.discount_per_each_access_ticket?.amount, session.total_price_per_ticket.currency)
            : null,
          isInvitation: Boolean(session.invitation),
          isTransactionFee,
          checkInDetails: session.check_in_details
            ? { isAvailable: session.check_in_details.is_available, completedAt: session.check_in_details.completed_at }
            : null,
          invitationId: session.invitation?.id ?? null,
          sessionOpenGatesAt: session.session.open_gates_at ?? undefined,
          showInvitationLabel: this.#getIsInvitationForPdf(session.invitation),
          nominativeValues: [],
          taxRate: session.tax_rate ?? undefined,
          fiscalLines: mapFiscalLinesFromApi(session.fiscal_lines),
          groupId: session.group_id,
          surchargeTaxRate: session.surcharge_tax_rate_national ?? undefined,
          productType: session.product_type ?? undefined,
          loyaltyUnitPrice: session.loyalty_price?.unit_amount ?? undefined,
          loyaltyTotalPrice: session.loyalty_price?.total_amount ?? undefined,
          hasReleaseConditions: session.has_release_conditions,
          releaseCondition: this.#mapReleaseCondition(session.release_condition),
        };
        accessTicketIds.push(accessTicketId);
        accessTicketMap.set(accessTicketId, accessTicket);
      }
    }
    return { accessTicketIds, accessTicketMap };
  }

  #mapReleaseCondition(releaseCondition: ReleaseConditionDTO | null | undefined): TicketReleaseCondition | undefined {
    if (!releaseCondition) {
      return undefined;
    }
    return {
      type: releaseCondition.type,
      action: releaseCondition.action ? { isEnabled: releaseCondition.action.is_enabled } : null,
    };
  }

  #getAccumulatedTransactionFee(ticket: TicketDTO): Money | undefined {
    const isTransactionFee =
      this.#getAddOnConfiguration(ticket.session.session_type?.add_on_configuration)?.category === AddOnCategory.transactionFee;
    if (!isTransactionFee) {
      return undefined;
    }
    const accumulatedTransactionFee = ticket.accumulated_transaction_fee;
    return accumulatedTransactionFee && accumulatedTransactionFee.amount !== null && accumulatedTransactionFee.currency
      ? new Money(accumulatedTransactionFee.amount, accumulatedTransactionFee.currency)
      : undefined;
  }

  #getDisplayChannelId(order: OrderDTO): string {
    if (order.channel_type === OrderChannelType.INVITATION && this.#hasFeverBackofficeInvitation(order.tickets)) {
      return ChannelId.FeverMarketplace;
    }

    return order.channel_id;
  }

  #getIsGuest(ticket: TicketDTO, order: OrderDTO): boolean {
    const hasInvitation = Boolean(ticket?.invitation);
    const isFeverPaidDiscount = order.coupon?.discount_paid_by === DiscountPaidBy.FEVER;
    const isFeverBackofficeInvitation =
      ticket?.invitation?.source === InvitationSource.BACKOFFICE && ticket?.invitation?.owner === InvitationOwner.FEVER;

    return hasInvitation && !isFeverBackofficeInvitation && !isFeverPaidDiscount;
  }

  #getChannelType(order: OrderDTO): OrderChannelType {
    const channelType = order.channel_type as OrderChannelType;

    if (channelType === OrderChannelType.INVITATION && this.#hasFeverBackofficeInvitation(order.tickets)) {
      return OrderChannelType.MARKETPLACE;
    }

    return channelType;
  }

  #hasFeverBackofficeInvitation(tickets: TicketDTO[]): boolean {
    return tickets.some(
      ticket => ticket.invitation?.source === InvitationSource.BACKOFFICE && ticket.invitation?.owner === InvitationOwner.FEVER,
    );
  }

  #getChannel(order: OrderDTO): Channel | null {
    const isFeverInvitation = order.channel_type === OrderChannelType.INVITATION && this.#hasFeverBackofficeInvitation(order.tickets);

    if (isFeverInvitation) {
      return new Channel(ChannelId.FeverMarketplace, FEVER_BACKOFFICE_INVITATION_DISPLAY_NAME, OrderChannelType.MARKETPLACE);
    }

    if (!order.channel_name || !order.channel_id) {
      return null;
    }

    return new Channel(order.channel_id, order.channel_name, order.channel_type);
  }

  #getIsInvitationForPdf(invitation: InvitationDTO | undefined): boolean {
    if (!invitation) {
      return false;
    }
    const isFeverBackofficeInvitation = invitation.source === InvitationSource.BACKOFFICE && invitation.owner === InvitationOwner.FEVER;
    return !isFeverBackofficeInvitation;
  }

  #getMapOrderDetails(order: OrderDTO): {
    accessTickets: Map<string, AccessTicket>;
    products: Map<string, AccessTicket>;
    sessionItemsByDatetime: Map<string, CartSession[]>;
    ticketsAndProducts: Map<string, AccessTicket>;
  } {
    const sessionItemsByDatetime: Map<string, CartSession[]> = new Map();
    const accessTickets: Map<string, AccessTicket> = new Map();
    const products: Map<string, AccessTicket> = new Map();
    const ticketsAndProducts: Map<string, AccessTicket> = new Map();

    order.tickets.forEach(ticketSession => {
      let sessionItems: CartSession[] = [];

      if (sessionItemsByDatetime.has(ticketSession.session.starts_at)) {
        sessionItems = sessionItemsByDatetime.get(ticketSession.session.starts_at) ?? [];
      }
      const { accessTicketIds, accessTicketMap } = this.#getAccessTicketInformation(ticketSession, order);

      sessionItemsByDatetime.set(ticketSession.session.starts_at, sessionItems);
      const parentSession = new CartSession(
        ticketSession.session.id,
        ticketSession.units,
        ticketSession.session.title,
        ticketSession.session.starts_at,
        ticketSession.session.ends_at,
        ticketSession.session.timezone,
        ticketSession.unit_price && ticketSession.unit_price.amount !== null && ticketSession.unit_price.currency
          ? new Money(ticketSession.unit_price.amount, ticketSession.unit_price.currency)
          : undefined,
        ticketSession.price.amount !== null && ticketSession.price.currency && ticketSession.price
          ? new Money(ticketSession.price.amount, ticketSession.price.currency)
          : undefined,
        ticketSession.total_surcharge_per_ticket &&
        ticketSession.total_surcharge_per_ticket.amount !== null &&
        ticketSession.total_surcharge_per_ticket.currency
          ? new Money(ticketSession.total_surcharge_per_ticket.amount, ticketSession.total_surcharge_per_ticket.currency)
          : undefined,
        ticketSession.surcharge_per_ticket &&
        ticketSession.surcharge_per_ticket.amount !== null &&
        ticketSession.surcharge_per_ticket.currency
          ? new Money(ticketSession.surcharge_per_ticket.amount, ticketSession.surcharge_per_ticket.currency)
          : undefined,
        ticketSession.seats?.length > 0 ? ticketSession.seats.map(seat => this.#addAccessSeats(seat, order.plan.id)) : undefined,
        [],
        ticketSession.id ?? undefined,
        ticketSession.total && ticketSession.total.amount !== null && ticketSession.total.currency
          ? new Money(ticketSession.total.amount, ticketSession.total.currency)
          : undefined,
        accessTicketIds,
        ticketSession.status as ValidationStatus,
        ticketSession.validated_count,
        ticketSession.session.place.address,
        ticketSession.session.place.id,
        ticketSession.session.place.city.standard_id,
        this.#getOwnerName(ticketSession),
        ticketSession.codes?.length > 0,
        ticketSession.redeemed_at ?? undefined,
        this.#getIsGuest(ticketSession, order),
        ticketSession.transfers?.map(this.#getTicketTransferInformation),
        'expires_at' in ticketSession.session ? this.#calculateIsExpired(ticketSession.session.expires_at) : false,
        ticketSession.created_at || undefined,
        this.#getOwnerEmail(ticketSession),
        this.#getSessionType(ticketSession.session.session_type),
        undefined,
        order.adjustment ? this.#getOverridePrices(ticketSession) : undefined,
        ticketSession.session.is_pack || false,
        order.catalog_plan?.id ?? order.plan.id,
        this.#getUserPhone(ticketSession),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ticketSession.transfer_intents?.map(this.#getTransferIntentInformation),
        ticketSession.session.open_gates_at ?? undefined,
        ticketSession.session.place.name,
        undefined,
        this.#getTicketUserEmail(ticketSession),
        undefined,
        ticketSession.target_entitlement_session_type_id,
        ticketSession.loyalty_price?.unit_amount ?? undefined,
        ticketSession.loyalty_price?.total_amount ?? undefined,
        this.#getAccumulatedTransactionFee(ticketSession),
        this.#getReferencePrice(ticketSession),
      );

      const orderManualPrice = this.#getOrderManualPrice(ticketSession);
      if (orderManualPrice !== null) {
        parentSession.orderManualPrice = orderManualPrice;
      }
      const cancellationInsurancePartnerShare = this.#getCancellationInsurancePartnerShare(ticketSession);
      if (cancellationInsurancePartnerShare !== null) {
        parentSession.cancellationInsurancePartnerShare = cancellationInsurancePartnerShare;
      }
      const packConstituents = this.#getPackedShopProductSessions(ticketSession);
      if (packConstituents.length > 0) {
        parentSession.packConstituents = packConstituents;
      }
      sessionItems.push(parentSession);

      accessTicketMap.forEach((ticket, key) => {
        ticketsAndProducts.set(key, ticket);

        if (ticketSession.session.session_type?.is_shop_product === true) {
          products.set(key, ticket);
        } else {
          accessTickets.set(key, ticket);
        }
      });
    });
    return { sessionItemsByDatetime, accessTickets, products, ticketsAndProducts };
  }

  #getPackedShopProductSessions(ticketSession: TicketDTO): CartSession[] {
    return (ticketSession.session.packed_sessions ?? [])
      .filter(packedSession => packedSession.session_type?.is_shop_product === true)
      .map(packedSession => {
        const constituent = new CartSession(
          packedSession.id,
          packedSession.units,
          packedSession.label,
          packedSession.starts_at,
          packedSession.ends_at,
          ticketSession.session.timezone,
        );
        constituent.accessTicketIds = [];
        constituent.hasCodes = false;
        constituent.sessionAddress = ticketSession.session.place.address;
        constituent.sessionAddressId = ticketSession.session.place.id;
        constituent.sessionType = this.#getSessionType(packedSession.session_type);
        constituent.status = ticketSession.status as ValidationStatus;
        constituent.packConstituentOf = ticketSession.id;
        return constituent;
      });
  }

  #mapCatalogPlan(dto: OrderDTO['catalog_plan']): CatalogPlan | undefined {
    if (!dto) {
      return undefined;
    }
    return { id: dto.id, name: dto.name };
  }

  #mapGroupMembers(groupMembers: OrderDTO[] | undefined): Order[] | undefined {
    if (groupMembers === undefined || groupMembers.length === 0) {
      return undefined;
    }
    return groupMembers.map(member => this.fromApi(member));
  }

  #hasShopsEntitlement(tickets: TicketDTO[]): boolean | undefined {
    const entitlementsMissing = tickets.every(ticket => ticket.entitlements === undefined);
    if (entitlementsMissing) {
      return undefined;
    }

    const hasShopsEntitlement = tickets.some(
      ticket => ticket.entitlements?.some(entitlement => entitlement.entitlement_type === EntitlementType.SHOPS) ?? false,
    );

    return hasShopsEntitlement;
  }

  #mapEntitlementsInfo(dto: OrderDTO['entitlements_info']): EntitlementsInfo | undefined {
    if (!dto) {
      return undefined;
    }
    return {
      maxRescheduleDate: dto.max_reschedule_date,
      minRescheduleDate: dto.min_reschedule_date,
      maxReschedules: dto.max_reschedules,
      status: dto.status,
      usedReschedules: dto.used_reschedules,
    };
  }

  #getNominativeValues(
    codeId: number,
    bookingAnswers: BookingAnswerDTO[],
    bookingQuestions: BookingQuestionDTO[],
  ): Array<{ label: string; value: string }> {
    return bookingAnswers
      .filter(bookingAnswer => bookingAnswer.code_id === codeId)
      .reduce((nominativeValues: Array<{ label: string; value: string }>, bookingAnswer: BookingAnswerDTO) => {
        const bookingQuestion: BookingQuestionDTO = bookingQuestions.find(
          question => question.id === bookingAnswer.booking_question_id,
        ) as BookingQuestionDTO;
        const hasNominativeTicketConfiguration =
          bookingQuestion.nominative_ticket_configuration != null &&
          Object.values(BookingQuestionNominativeTicketConfiguration).includes(bookingQuestion.nominative_ticket_configuration);
        if (hasNominativeTicketConfiguration) return nominativeValues;
        return [
          ...nominativeValues,
          {
            label: bookingQuestion?.label,
            value: bookingAnswer.value?.[0],
          },
        ];
      }, []);
  }

  #getOrderDetails(order: OrderDTO): {
    accessTickets: Map<string, AccessTicket>;
    cart: Cart;
    products: Map<string, AccessTicket>;
    ticketsAndProducts: Map<string, AccessTicket>;
  } {
    const timezone: string = order?.tickets[0]?.session.timezone ?? null;
    const { sessionItemsByDatetime, accessTickets, products, ticketsAndProducts } = this.#getMapOrderDetails(order);
    const cart: Cart = new Cart(
      sessionItemsByDatetime,
      timezone,
      order.cart_id,
      order.number_of_tickets,
      order.total && order.total.amount !== null && order.total.currency ? new Money(order.total.amount, order.total.currency) : null,
      order.total_surcharge && order.total_surcharge.amount !== null && order.total_surcharge.currency
        ? new Money(order.total_surcharge.amount, order.total_surcharge.currency)
        : null,
      order.total_surcharge_per_ticket && order.total_surcharge_per_ticket.amount !== null && order.total_surcharge_per_ticket.currency
        ? new Money(order.total_surcharge_per_ticket.amount, order.total_surcharge_per_ticket.currency)
        : null,
      order.user_confirmation_messages ? order.user_confirmation_messages : [],
      order.created_at,
      order.prepared_at,
      order.confirmed_at,
      order.user_id ?? null,
      order.coupon
        ? {
            code: order.coupon.code,
            creationPurpose: order.coupon.creation_purpose,
            discount: order.coupon.discount,
            discountPaidBy: order.coupon.discount_paid_by,
          }
        : null,
      this.#getChannel(order),
      CartUtil.hasSessionsInFuture(sessionItemsByDatetime, timezone),
      order.tickets.some(ticket => ticket.seats?.length > 0),
      order.payment_method as PaymentType,
      undefined,
      undefined,
      undefined,
      order.adjustment
        ? {
            amount: order.adjustment.amount,
            concept: order.adjustment.concept,
            operation: (order.adjustment as CartAdjustmentPriceWithOperationData)?.operation,
            calculation: (order.adjustment as CartAdjustmentPriceWithOperationData)?.calculation,
            total: order.adjustment.total,
            rounded: order.adjustment.rounded,
          }
        : undefined,
      order.total_without_override,
      undefined,
      undefined,
      undefined,
      order.promotion
        ? {
            name: order.promotion.name,
            discount: order.promotion.discount,
            discountPaidBy: order.promotion.discount_payer,
          }
        : undefined,
      order.coupons
        ? {
            vouchers: order.coupons.vouchers.map(voucher => ({
              code: voucher.code,
              discount: new Money(voucher.discount.amount, voucher.discount.currency),
              discountPaidBy: voucher.discount_paid_by,
            })),
            discounts: order.coupons.discounts.map(discount => ({
              code: discount.code,
              currency: discount.currency,
              discounts: discount.discounts.map(discountItem => ({
                ticketTypeId: discountItem.session_type_id,
                discount: discountItem.discount,
                discountType: discountItem.discount_type,
              })),
            })),
          }
        : undefined,
    );
    return { cart, accessTickets, products, ticketsAndProducts };
  }

  #getOrderUser(user: UserTicketDTO | undefined): User | undefined {
    if (!user) {
      return undefined;
    }
    const orderUser = new User(user.id, user.email);
    if (user.phone_number) {
      orderUser.phoneNumber = user.phone_number;
    }
    orderUser.firstName = user.first_name;
    orderUser.lastName = user.last_name;
    return orderUser;
  }

  #getOrderManualPrice(ticket: TicketDTO): CartAdjustmentPrice | null {
    const manualPrice = ticket.manual_price;
    if (manualPrice == null) {
      return null;
    }
    const { amount, calculation, concept, operation } = manualPrice;
    if (calculation === CartAdjustmentPriceCalculationFinal.FINAL) {
      return { amount, calculation, concept };
    }
    return operation === null ? null : { amount, calculation, concept, operation };
  }

  #getCancellationInsurancePartnerShare(ticket: TicketDTO): CancellationInsurancePartnerShare | null {
    const partnerShare = ticket.cancellation_insurance_partner_share;
    if (partnerShare == null) {
      return null;
    }
    return {
      price: new Money(partnerShare.price.amount, partnerShare.price.currency),
      unitPrice: new Money(partnerShare.unit_price.amount, partnerShare.unit_price.currency),
    };
  }

  #getReferencePrice(ticket: TicketDTO): ReferencePrice | undefined {
    const referencePrice = ticket.reference_price;
    if (!referencePrice || !referencePriceProvenances.includes(referencePrice.provenance)) {
      return undefined;
    }
    const price = this.#getReferencePriceMoney(referencePrice.price);
    const pricePerTicket = this.#getReferencePriceMoney(referencePrice.price_per_ticket);
    const total = this.#getReferencePriceMoney(referencePrice.total);
    const unitPrice = this.#getReferencePriceMoney(referencePrice.unit_price);
    if (!price || !pricePerTicket || !total || !unitPrice) {
      return undefined;
    }
    return { price, pricePerTicket, provenance: referencePrice.provenance, total, unitPrice };
  }

  #getReferencePriceMoney(money: IMoney | null | undefined): Money | undefined {
    return money && money.amount != null && money.currency ? new Money(money.amount, money.currency) : undefined;
  }

  #getOverridePrices(sessionItem: TicketDTO): CartSessionAdjustmentPrice | undefined {
    if (!sessionItem.override_prices) {
      return undefined;
    }
    return {
      totalPriceWithOverride: {
        amount: sessionItem.override_prices.total_price_with_override.amount,
        currency: sessionItem.override_prices.total_price_with_override.currency,
      },
      totalPriceWithoutOverride: {
        amount: sessionItem.override_prices.total_price_without_override.amount,
        currency: sessionItem.override_prices.total_price_without_override.currency,
      },
      totalSurchargeWithOverride: {
        amount: sessionItem.override_prices.total_surcharge_with_override.amount,
        currency: sessionItem.override_prices.total_surcharge_with_override.currency,
      },
      totalSurchargeWithoutOverride: {
        amount: sessionItem.override_prices.total_surcharge_without_override.amount,
        currency: sessionItem.override_prices.total_surcharge_without_override.currency,
      },
    };
  }

  #getOwnerEmail(ticket: TicketDTO): string | undefined {
    return (ticket.invitation?.recipient_email ?? ticket.user.email) || undefined;
  }

  #getTicketUserEmail(ticket: TicketDTO): string | undefined {
    return ticket.user?.email || undefined;
  }

  #getOwnerName(ticket: TicketDTO): string {
    if (ticket.invitation) {
      const { first_name, last_name } = ticket.invitation;
      return [first_name, last_name].filter(Boolean).join(' ');
    }
    return ticket.user.fullname;
  }

  #getUserPhone(ticket: TicketDTO): string | undefined {
    return ticket.user.phone_number || undefined;
  }

  #getTicketTimeGranularity(timeGranularity: TicketTimeGranularity | null): TicketTimeGranularity | null {
    return Object.values(TicketTimeGranularity).includes(timeGranularity as TicketTimeGranularity)
      ? (timeGranularity as TicketTimeGranularity)
      : null;
  }

  #getAddOnConfiguration(addOnConfiguration: OrderAddOnConfigurationDTO | null | undefined): SessionTypeAddOnConfiguration | undefined {
    if (!addOnConfiguration) {
      return undefined;
    }
    return { category: Object.values(AddOnCategory).find(category => category === addOnConfiguration.category) };
  }

  #getSessionType(sessionType: SessionTypeDTO): SessionType {
    const newSessionType = new SessionType(sessionType.id, sessionType.label);
    newSessionType.isShopProduct = sessionType.is_shop_product;
    newSessionType.isTimeless = sessionType.is_timeless;
    newSessionType.isEntryPass = sessionType.is_entry_pass ?? false;
    newSessionType.addOnConfiguration = this.#getAddOnConfiguration(sessionType.add_on_configuration);
    return newSessionType;
  }

  #getSpot(categoryLabel: string | null, label: string | null): Spot | undefined {
    return categoryLabel ? { categoryLabel, label } : undefined;
  }

  #getTaxInformation(taxes: Array<OrderTaxesDTO>, currency: string): Array<OrderTaxes> {
    const orderTaxes: Array<OrderTaxes> = [];
    taxes.forEach(tax =>
      orderTaxes.push({
        name: tax.tax_name,
        baseAmount: new Money(tax.tax_base, currency),
        rate: tax.tax_rate,
        totalAmount: new Money(tax.total_tax_amount, currency),
      }),
    );
    return orderTaxes;
  }

  #getTicketHolderName(codeId: number, bookingAnswers: BookingAnswerDTO[], bookingQuestions: BookingQuestionDTO[]): string | null {
    const firstNameId = bookingQuestions.find(
      question => question.nominative_ticket_configuration === BookingQuestionNominativeTicketConfiguration.FIRST_NAME,
    )?.id;
    const lastNameId = bookingQuestions.find(
      question => question.nominative_ticket_configuration === BookingQuestionNominativeTicketConfiguration.LAST_NAME,
    )?.id;

    const fullName = {
      firstName: '',
      lastName: '',
    };

    bookingAnswers
      .filter(answer => answer.code_id === codeId)
      .forEach(bookingAnswer => {
        if (bookingAnswer.booking_question_id == firstNameId) {
          fullName.firstName = bookingAnswer.value?.[0];
        } else if (bookingAnswer.booking_question_id == lastNameId) {
          fullName.lastName = bookingAnswer.value?.[0];
        }
      });

    return fullName.firstName || fullName.lastName ? `${fullName.firstName} ${fullName.lastName}`.trim() : null;
  }

  #getTicketTransferInformation(transfer: TicketTransferDTO): TicketTransfer {
    return {
      id: transfer.id,
      receivedTicketId: transfer.received_ticket_id,
      ticketToTransferId: transfer.ticket_to_transfer_id,
      transferType: transfer.transfer_type as TransferTypeEnum,
      count: transfer.count,
      createdAt: transfer.created_at,
    };
  }

  #getTransferIntentInformation(transferIntent: TicketTransferIntentDTO): TransferIntent {
    return {
      id: transferIntent.id,
      codes: transferIntent.codes.map(code => ({ code: code.code, id: code.id })),
      count: transferIntent.count,
      createdAt: transferIntent.created_at,
      onlyClaimableBy: transferIntent.only_claimable_by ? { email: transferIntent.only_claimable_by.email } : null,
      status: transferIntent.status as TransferIntentStatus,
      ticketId: transferIntent.ticket_id,
      ticketTransferId: transferIntent.ticket_transfer_id,
      userId: transferIntent.user_id,
    };
  }

  #mapBreakdownItem(breakdownDTO: SerializedBreakdownItemDTO): BreakdownItem {
    return {
      label: breakdownDTO.label,
      isValidated: breakdownDTO.is_validated,
      code: breakdownDTO.code ? this.#mapSerializedCode(breakdownDTO.code) : null,
      seat: breakdownDTO.seat ? this.#mapSerializedSeat(breakdownDTO.seat) : null,
      nominativeFirstName: breakdownDTO.nominative_first_name ?? null,
      nominativeLastName: breakdownDTO.nominative_last_name ?? null,
    };
  }

  #mapCancellableItem(itemDTO: SerializedCancellableItemDTO): CancellableItem {
    return {
      referenceId: itemDTO.reference_id,
      orderItemIds: itemDTO.order_item_ids,
      validatedStatus: itemDTO.validated_status as CancellableItemValidationStatus,
      isCancelled: itemDTO.is_cancelled,
      manualRefundAmount: new Money(itemDTO.manual_refund_amount.amount, itemDTO.manual_refund_amount.currency),
      code: itemDTO.code ? this.#mapSerializedCode(itemDTO.code) : null,
      seat: itemDTO.seat ? this.#mapSerializedSeat(itemDTO.seat) : null,
      breakdownItems: itemDTO.breakdown_items.map(breakdown => this.#mapBreakdownItem(breakdown)),
      nominativeFirstName: itemDTO.nominative_first_name ?? null,
      nominativeLastName: itemDTO.nominative_last_name ?? null,
    };
  }

  #mapSerializedCode(codeDTO: SerializedCodeDTO): TicketCode {
    return {
      id: codeDTO.id,
      code: codeDTO.code,
      type: codeDTO.type,
      status: codeDTO.status,
      isValidated: codeDTO.is_validated,
      sessionLabel: codeDTO.session_label,
      imageUrl: codeDTO.image_url,
      redeemedAt: codeDTO.redeemed_at,
      validity: codeDTO.validity
        ? {
            activationDate: codeDTO.validity.activation_date,
            expiryDate: codeDTO.validity.expiry_date,
          }
        : null,
    };
  }

  #mapSerializedSeat(seatDTO: SerializedAssignedSeatDTO): AssignedSeat {
    return {
      id: seatDTO.id,
      label: seatDTO.label,
      seatingProvider: seatDTO.seating_provider,
    };
  }

  #mapTicketsSummaries(ticketsSummariesDTO: TicketSummaryDTO[]): TicketSummary[] {
    return ticketsSummariesDTO.map(summary => ({
      ticketId: summary.ticket_id,
      ticketTypeLabel: summary.ticket_type_label,
      validatedCount: summary.validated_count,
      totalCount: summary.total_count,
      cancellableItems: summary.cancellable_items.map(item => this.#mapCancellableItem(item)),
      mainStatus: (summary.main_status as TicketMainStatus) ?? TicketMainStatus.DEFAULT,
    }));
  }

  #mapUserCancellationRecords(userCancellationRecordsDTO: UserCancellationRecordDTO[]): OrderUserCancellationRecord[] {
    return userCancellationRecordsDTO.map(userCancellationRecord => ({
      cancellationCouponCode: userCancellationRecord.cancellation_coupon_code ?? null,
      cancellationCouponType: userCancellationRecord.cancellation_coupon_type ?? null,
      cancellationGroupId: userCancellationRecord.cancellation_group_id,
      cancellationReason: userCancellationRecord.cancellation_reason,
      partnerCancellationReason: userCancellationRecord.partner_cancellation_reason
        ? {
            key: userCancellationRecord.partner_cancellation_reason.key,
            label: userCancellationRecord.partner_cancellation_reason.label,
          }
        : null,
      refundReason: userCancellationRecord.refund_reason,
      cancelledTickets: (userCancellationRecord.cancelled_tickets ?? []).map(cancelledTicket =>
        this.#mapUserCancellationRecordTicket(cancelledTicket),
      ),
      comments: userCancellationRecord.comments ?? '',
      compensationCouponCode: userCancellationRecord.compensation_coupon_code ?? null,
      createdAt: userCancellationRecord.created_at,
      id: userCancellationRecord.id,
      isPartnerVisible: userCancellationRecord.is_partner_visible ?? true,
      isPostCancellationRefund: userCancellationRecord.is_post_cancellation_refund,
      notifiedAt: userCancellationRecord.notified_at ?? null,
      reimbursementType: isReimbursementType(userCancellationRecord.reimbursement_type) ? userCancellationRecord.reimbursement_type : null,
      refundedAmount: userCancellationRecord.refunded_amount
        ? new Money(userCancellationRecord.refunded_amount.amount, userCancellationRecord.refunded_amount.currency)
        : null,
      refundedAt: userCancellationRecord.refunded_at ?? null,
      requesterEmail: userCancellationRecord.requester_email ?? null,
      ticketsOwner: userCancellationRecord.tickets_owner
        ? {
            id: userCancellationRecord.tickets_owner.id,
            email: userCancellationRecord.tickets_owner.email,
            firstName: userCancellationRecord.tickets_owner.first_name,
            lastName: userCancellationRecord.tickets_owner.last_name,
            fullname: userCancellationRecord.tickets_owner.fullname,
            phoneNumber: userCancellationRecord.tickets_owner.phone_number,
          }
        : null,
    }));
  }

  #mapUserCancellationRecordTicket(cancelledTicket: CancelledTicketDTO): OrderCancelledTicketRecord {
    return {
      cancellationCouponCode: cancelledTicket.cancellation_coupon_code ?? null,
      cancellationCouponAmount: cancelledTicket.cancellation_coupon_amount
        ? new Money(cancelledTicket.cancellation_coupon_amount.amount, cancelledTicket.cancellation_coupon_amount.currency)
        : null,
      cancellationCouponIsAvailable: cancelledTicket.cancellation_coupon_is_available ?? null,
      compensationCouponCode: cancelledTicket.compensation_coupon_code ?? null,
      compensationCouponAmount: cancelledTicket.compensation_coupon_amount
        ? new Money(cancelledTicket.compensation_coupon_amount.amount, cancelledTicket.compensation_coupon_amount.currency)
        : null,
      compensationCouponIsAvailable: cancelledTicket.compensation_coupon_is_available ?? null,
      count: cancelledTicket.count,
      label: cancelledTicket.label,
      shouldNotify: cancelledTicket.should_notify,
      notifiedAt: cancelledTicket.notified_at,
      ticketId: cancelledTicket.ticket_id,
      ticketOwner: cancelledTicket.ticket_owner
        ? {
            id: cancelledTicket.ticket_owner.id,
            email: cancelledTicket.ticket_owner.email,
            firstName: cancelledTicket.ticket_owner.first_name,
            lastName: cancelledTicket.ticket_owner.last_name,
            fullname: cancelledTicket.ticket_owner.fullname,
            phoneNumber: cancelledTicket.ticket_owner.phone_number,
          }
        : null,
    };
  }
}
