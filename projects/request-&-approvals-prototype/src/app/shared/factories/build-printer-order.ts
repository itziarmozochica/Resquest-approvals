import { formatDate } from '@angular/common';

import { Currency } from '@fz-original/app/modules/settings/shared/models/currency-enum';
import moment, { Moment } from 'moment-timezone';

import { formatLocalDateTime, formatLocalFullDate } from '../components/date-selector/date-selector.util';
import { Money } from '../models/money.model';
import { AccessTicket, getDiscountApplied } from '../models/order/access-ticket.model';
import { CodeType } from '../models/order/code-type.model';
import { Order } from '../models/order/order.model';
import { PrinterOrder, PrinterOrderLabels, PrinterTicket } from '../models/order/printer-order.model';
import { DateUtil } from '../utils/date.util';
import { replaceCurrencySymbolWithCode } from '../utils/print-text.util';

const invitationCouponCreationPurpose = 'invitation';

export function buildPrinterOrder(
  order: Order,
  accessTickets: Map<string, AccessTicket>,
  labels: PrinterOrderLabels,
  position?: number,
  isHidePriceEnabled: boolean = false,
): PrinterOrder {
  let firstTicket: AccessTicket | undefined;
  let totalAggregated = 0;
  let discountAggregated = 0;
  let unitPriceAggregated = 0;
  let surchargePerTicketAggregated = 0;
  let loyaltyPointsAggregated = 0;
  const tickets: Record<string, PrinterTicket> = {};
  accessTickets.forEach((accessTicket: AccessTicket) => {
    if (!firstTicket) {
      firstTicket = accessTicket;
    }
    const discount = getDiscountApplied(accessTicket);
    totalAggregated += accessTicket.total.amount;
    discountAggregated += discount.amount;
    unitPriceAggregated += accessTicket.unitPrice.amount;
    surchargePerTicketAggregated += accessTicket.surchargePerTicket.amount;
    loyaltyPointsAggregated += accessTicket.loyaltyUnitPrice ?? 0;
    const ticketLabel = getTicketLabel(accessTicket);
    const previousTicket: PrinterTicket = tickets[ticketLabel] ?? {
      expiryDate: accessTicket.expiryDate ? DateUtil.formatDate(accessTicket.expiryDate, 'long', 'short') : undefined,
      holderName: accessTicket.holderName,
      label: ticketLabel,
      numberOfTickets: 0,
      seats: [],
      session_label: accessTicket.sessionLabel === ticketLabel ? undefined : accessTicket.sessionLabel,
      timeGranularity: accessTicket.timeGranularity,
    };
    const seat = accessTicket.seat;
    tickets[ticketLabel] = {
      ...previousTicket,
      numberOfTickets: previousTicket.numberOfTickets + 1,
      seats: seat != null && seat !== '' ? [...previousTicket.seats, seat] : previousTicket.seats,
    };
  });
  const showInvitationLabel: boolean = firstTicket?.showInvitationLabel ?? false;
  const hasLoyaltyPricing = Array.from(accessTickets.values()).every(
    (accessTicket: AccessTicket) => accessTicket.loyaltyUnitPrice != null && accessTicket.loyaltyUnitPrice !== 0,
  );
  const shouldUseInvitationPricing = showInvitationLabel && !hasLoyaltyPricing;
  const timezone = order.cart?.timezone ?? '';
  const startDate = moment(firstTicket?.sessionStartsAt).tz(timezone);
  const startDateFormatted = formatLocalFullDate(firstTicket?.sessionStartsAt ?? '', labels.locale || 'en', timezone);
  const startsAtDateShortFormat = formatLocalizedDate(startDate, 'dd/MM/yyyy', labels.locale);
  const sessionStartsAtTime = formatLocalizedDate(startDate, 'HH:mm', labels.locale);
  const createdAtFormat = formatLocalDateTime(order.cart?.createdAt ?? '', labels.locale || 'en', timezone);
  const invitationTotalPriceFirstRow = `${labels.invitation}`;
  const firstTicketTotalCurrency: string = firstTicket?.total.currency ?? Currency.EUR;
  const invitationTotalPriceSecondRow = `       ${labels.total}: ${new Money(0, firstTicketTotalCurrency).toString()} (${labels.vat})`;
  const totalIncludingImpAndDto = new Money(totalAggregated - discountAggregated, firstTicketTotalCurrency);
  const unitPrice = new Money(unitPriceAggregated, firstTicketTotalCurrency);
  const surchargePerTicket = new Money(surchargePerTicketAggregated, firstTicketTotalCurrency);
  let defaultTotalPriceFirstRow: string;
  let defaultPriceSecondRow: string;
  if (isHidePriceEnabled) {
    defaultTotalPriceFirstRow = '';
    defaultPriceSecondRow = '';
  } else if (hasLoyaltyPricing) {
    defaultTotalPriceFirstRow = labels.formatLoyaltyPoints(loyaltyPointsAggregated);
    defaultPriceSecondRow = `       ${labels.total}: ${labels.formatLoyaltyPoints(loyaltyPointsAggregated)}`;
  } else {
    // B2BO-6204: hide gross breakdown only for invitation-coupon discounts.
    const hasDiscount = discountAggregated > 0;
    const hasInvitationCouponDiscount = hasDiscount && isInvitationCoupon(order);
    defaultTotalPriceFirstRow = hasInvitationCouponDiscount
      ? ''
      : `${unitPrice.toString(labels.locale)}` +
        (surchargePerTicket.amount > 0 ? ' + ' + surchargePerTicket.toString(labels.locale) + ' ' + labels.surcharge : '');
    defaultPriceSecondRow = `       ${labels.total}: ${totalIncludingImpAndDto.toString(labels.locale)} (${hasInvitationCouponDiscount ? labels.totalIncludedInPrice : labels.vat})`;
  }
  return {
    channel: order.channelType,
    code: firstTicket?.code ?? '',
    codeType: firstTicket?.codeType ?? CodeType.NO_IMAGE,
    createdAt: createdAtFormat,
    orderId: order.externalId ?? '',
    placeId: order.placeId,
    plan: {
      id: order.planId ?? 0,
      name: order.planName ?? '',
      sessionSelectorType: order.sessionSelectorType ?? '',
      termsAndConditionsQrImage: order.termsAndConditionsQrImage ?? '',
    },
    position: position,
    pricing: {
      totalFirstRow: replaceCurrencySymbolWithCode(shouldUseInvitationPricing ? invitationTotalPriceFirstRow : defaultTotalPriceFirstRow),
      totalSecondRow: replaceCurrencySymbolWithCode(shouldUseInvitationPricing ? invitationTotalPriceSecondRow : defaultPriceSecondRow),
    },
    session: {
      address: firstTicket?.sessionAddress ?? '',
      isoCountryCode: firstTicket?.sessionIsoCountryCode ?? '',
      name: firstTicket?.sessionName ?? '',
      openGatesAt: firstTicket?.sessionOpenGatesAt ?? null,
      placeName: firstTicket?.sessionPlaceName,
      startsAtDate: startDateFormatted,
      startsAtDateShortFormat: startsAtDateShortFormat,
      startsAtTime: sessionStartsAtTime,
      timezone: order.cart?.timezone ?? undefined,
    },
    ticketId: accessTickets.size === 1 ? firstTicket?.ticketId : undefined,
    tickets: Object.values(tickets),
    totalOfTickets: order.accessTickets?.size ?? 0,
  };
}

export function formatLocalizedDate(momentDate: Moment, format: string, locale: string): string {
  if (!momentDate.isValid()) {
    return '';
  }
  const timezoneOffset = momentDate.format('Z');
  return formatDate(momentDate.toDate(), format, locale || 'en', timezoneOffset);
}

function getTicketLabel(accessTicket: AccessTicket): string {
  if (accessTicket.sessionLabel) {
    return accessTicket.sessionLabel;
  }

  if (accessTicket.sessionTicketReceiptLabel) {
    return accessTicket.sessionTicketReceiptLabel;
  }

  let sessionLabel = accessTicket.sessionName;
  if (sessionLabel.split('|').length > 1) {
    sessionLabel = accessTicket.sessionName.split('|').pop()?.trim() ?? sessionLabel;
  }

  return sessionLabel.match(/.{1,60}(?=\s|$)/g)?.map((chunk: string) => chunk.trim())[0] ?? sessionLabel;
}

function isInvitationCoupon(order: Order): boolean {
  const creationPurpose = order.cart?.appliedCoupon?.creationPurpose?.trim().toLowerCase() ?? '';

  return creationPurpose === invitationCouponCreationPurpose;
}
