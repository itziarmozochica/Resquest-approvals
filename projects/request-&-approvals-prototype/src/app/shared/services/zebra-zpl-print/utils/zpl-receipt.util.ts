import { PaperTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OrderTaxes } from '@fz-original/app/shared/models/order/order-taxes.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { MUSEUM_OF_ILLUSIONS_NEW_DELHI, PARADOX_MUSEUM_INDIA } from '@fz-original/app/shared/services/partner/partner.service';
import { replaceCurrencySymbolWithCode } from '@fz-original/app/shared/utils/print-text.util';

import { ZebraZplSetup, ZplReceiptLabels } from '../models/zebra-zpl.model';
import { getZplField } from './zpl-field.util';
import { generateZplTicket } from './zpl-ticket.util';

const receiptLeftLimit = 75;
const receiptLineHeight = 23;
const receiptFontSize = 23;
const prePrintedPaperOffset = 30;

export function getMuseumOfIllusionsNewDelhiLegalInformation(): string[] {
  return [
    'MUSEUM OF ILLUSIONS NEW DELHI',
    'TAX INVOICE',
    'ADDRESS: A30-33, 1ST FLOOR, A BLOCK INNER CIRCLE',
    'CONNAUGHT PLACE, NEW DELHI-110001',
    'GISTIN NO: 07AAJCR7489J1ZK',
    'HSN/SAC: 999699 PHONE NO: 011-40813301',
    'EMAIL: INFO@MUSEUMOFILLUSIONS.IN',
  ];
}

export function getParadoxMuseumIndiaLegalInformation(labels: ZplReceiptLabels): string[] {
  return [
    labels.title,
    'PARAADOX MUSEUM INDIA PVT LTD',
    `${labels.address}:-Shreeniwas House, 27, H Somani Marg, Azad Maidan,`,
    'Fort, Mumbai, Maharashtra 400001',
    'GSTIN:- 27AANCP5302N1Z0',
    'HSN/SAC:- 999699',
    `${labels.phone}:- 9833631313 / 7977493526`,
    `${labels.email}:- mumbai@paradoxmuseum.com`,
  ];
}

export function getLegalInformation(partnerId: number, labels: ZplReceiptLabels): string[] {
  switch (partnerId) {
    case PARADOX_MUSEUM_INDIA:
      return getParadoxMuseumIndiaLegalInformation(labels);
    case MUSEUM_OF_ILLUSIONS_NEW_DELHI:
      return getMuseumOfIllusionsNewDelhiLegalInformation();
    default:
      return [];
  }
}

export function getTaxesInformation(order: Order, partnerId: number, labels: ZplReceiptLabels, locale: string): string[] {
  const taxes: OrderTaxes[] = order.taxes ?? [];
  const taxLines: string[] = taxes.flatMap((tax: OrderTaxes, index: number) => {
    const totalLine = replaceCurrencySymbolWithCode(`${tax.name}: ${tax.totalAmount.toString(locale)}`);
    if (index === 0 || partnerId !== PARADOX_MUSEUM_INDIA) {
      return [replaceCurrencySymbolWithCode(`${labels.taxBase}: ${tax.baseAmount.toString(locale)}`), totalLine];
    }
    return [totalLine];
  });
  return ['', labels.taxBreakdown, ...taxLines, replaceCurrencySymbolWithCode(`${labels.total}: ${order?.cart?.total?.toString(locale)}`)];
}

export function getReceiptFormatZpl(text: readonly string[], xPos: number, yPos: number): string {
  let taxesInfoTextZpl = '';
  let lineYPos = yPos;
  text.forEach((taxInfoLine: string) => {
    lineYPos += receiptLineHeight;
    taxesInfoTextZpl += getZplField(xPos, lineYPos, taxInfoLine, receiptFontSize);
  });
  return taxesInfoTextZpl;
}

export function buildReceiptZpl(
  order: Order,
  partnerId: number,
  labels: ZplReceiptLabels,
  locale: string,
  setup: ZebraZplSetup,
  isLast: boolean,
): string {
  const paperOffset = setup.paperType == PaperTypeEnum.pre_printed_paper ? prePrintedPaperOffset : 0;
  let receiptBody: string[] = getLegalInformation(partnerId, labels);
  if (order.taxes?.length ?? 0 > 0) {
    receiptBody = receiptBody.concat(getTaxesInformation(order, partnerId, labels, locale));
  }
  const zplBody = getReceiptFormatZpl(receiptBody, receiptLeftLimit, 20 + paperOffset);
  return generateZplTicket(zplBody, isLast, setup.hasCutter, setup.paperType);
}
