import { PaperTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { CodeType } from '@fz-original/app/shared/models/order/code-type.model';
import { folioZeroCode, PrinterOrder, PrinterTicket } from '@fz-original/app/shared/models/order/printer-order.model';
import { TicketTimeGranularity } from '@fz-original/app/shared/models/order/ticket-time-granularity.enum';
import { getEffectiveBookingTimeGranularity } from '@fz-original/app/shared/utils/print-orders.util';
import { truncateText } from '@fz-original/app/shared/utils/print-text.util';

import { ZebraZplSetup, ZplLabelContext, zplPaperTypeCommand, ZplTicketLayout } from '../models/zebra-zpl.model';
import { addZplLine, getZplField } from './zpl-field.util';
import { getPartnerLogoZpl } from './zpl-logo.util';

const mainLeftLimit = 75;
const sideLeftLimit = 649;
const bottomBase = 535;
const prePrintedPaperOffset = 30;

export function generateZplTicket(zplBody: string, isLast: boolean, shouldCut: boolean, paperType: PaperTypeEnum): string {
  const startZplTicket = `^XA
            ${zplPaperTypeCommand[paperType]}
            ~JSN
            ^LT-25
            ^MNA
            ^MTD
            ^POI
            ^PMN
            ^LH0,0
            ^JMA
            ^PR5,5
            ~SD15
            ^JUS
            ^LRN
            ^CI28
            ^PA0,1,1,0
            ^XZ
            ^XA
            ${shouldCut && isLast ? '^MMC' : '^MMT'}
            ^PW863
            ^LS0`;
  const endZplTicket = `^PQ1,0,1,Y
            ^XZ`;
  return startZplTicket + zplBody + endZplTicket;
}

export function getEventInfoZpl(printerOrder: PrinterOrder, xPos: number, yPos: number): string {
  const eventName: string = getZplField(xPos, yPos, `${truncateText(printerOrder.plan.name, 100)}`, 34);
  return '^FB570,3' + eventName;
}

export function getSessionInfoZpl(printerOrder: PrinterOrder, xPos: number, yPos: number): string {
  let lines: readonly string[] = [];
  lines = addZplLine(lines, xPos, yPos, truncateText(printerOrder.session.address, 100), 25);
  const effectiveTimeGranularity = getEffectiveBookingTimeGranularity(printerOrder);
  if (effectiveTimeGranularity === TicketTimeGranularity.DATE_AND_TIME) {
    lines = addZplLine(lines, xPos, 35, `${printerOrder.session.startsAtDate} - ${printerOrder.session.startsAtTime}`, 25);
  } else if (effectiveTimeGranularity === TicketTimeGranularity.DATE) {
    lines = addZplLine(lines, xPos, 35, printerOrder.session.startsAtDate, 25);
  }
  return lines.join();
}

export function getTicketsDetailZpl(printerOrder: PrinterOrder, xPos: number, yPos: number, isUnifiedTicket: boolean = false): string {
  let lines: readonly string[] = [];
  let yOffset = yPos;
  const isFolioZero = printerOrder.code === folioZeroCode;

  printerOrder.tickets.forEach((ticket: PrinterTicket) => {
    let xOffset = xPos + 45;
    let blockSize = 40;
    if (ticket.numberOfTickets >= 100) {
      blockSize = 51;
      xOffset += 10;
    }

    lines = addZplLine(lines, xPos, yOffset, `${ticket.numberOfTickets}x `, 28, `^FB${blockSize},,,R`);
    lines = addZplLine(lines, xOffset, 0, truncateText(ticket.label, isUnifiedTicket ? 45 : 55), 28);
    yOffset = 30;
    if (ticket.session_label) {
      lines = addZplLine(lines, xOffset, yOffset, ticket.session_label, 25);
    }
    if (ticket.seats.length > 0) {
      lines = addZplLine(lines, xOffset, yOffset, ticket.seats.join(', '), 25);
    }
    yOffset = 35;
  });
  lines = addZplLine(lines, xPos, 55, printerOrder.pricing.totalFirstRow, 25, '^FB470, 2');
  if (!isFolioZero) {
    lines = addZplLine(lines, xPos, 55, printerOrder.pricing.totalSecondRow, 25, '^FB470, 2');
  }
  return lines.join();
}

export function getPurchaseInfoZpl(printerOrder: PrinterOrder, xPos: number, yPos: number, purchasedAtLabel: string): string {
  return getZplField(xPos, yPos, purchasedAtLabel + ' ' + printerOrder.createdAt);
}

export function getNumberOfTicketsZpl(printerOrder: PrinterOrder, xPos: number, yPos: number): string {
  let lines: readonly string[] = [];
  let fontSize = 100;
  if (printerOrder.totalOfTickets >= 100) {
    fontSize = 80;
  }
  lines = addZplLine(lines, xPos, yPos, printerOrder.totalOfTickets, fontSize, '^FB150,,,C');
  lines = addZplLine(lines, xPos, 30, 'tickets', 25, '^FB135,,,C');
  return lines.join();
}

export function getOrderInfoZpl(
  printerOrder: PrinterOrder,
  xPos: number,
  yPos: number,
  ticketIdLabel: string,
  orderIdLabel: string,
): string {
  let lines: readonly string[] = [];
  let orderYPos = yPos;
  if (printerOrder.ticketId) {
    lines = addZplLine(lines, xPos, yPos - 55, ticketIdLabel, 17);
    lines = addZplLine(lines, xPos, 25, printerOrder.ticketId, 25);
    orderYPos = 30;
  }

  lines = addZplLine(lines, xPos, orderYPos, orderIdLabel, 17);
  lines = addZplLine(lines, xPos, 25, printerOrder.orderId, 25);

  return lines.join();
}

export function getTermsAndConditionsZpl(printerOrder: PrinterOrder, xPos: number, yPos: number, termsHeaderLabel: string): string {
  if (!printerOrder.plan.termsAndConditionsQrImage) {
    return '';
  }
  return `^FO20,20^FT${xPos},${yPos + 10}^BQ,2,1.1^FDQA, ${printerOrder.plan.termsAndConditionsQrImage}^FS
             ^FB100,2
             ^FT${xPos + 100},${yPos}^A0N,17,16,TT0003M_^CI28^FD${termsHeaderLabel}^FS^CI27^FS`;
}

export function getEan13BarcodeZpl(printerOrder: PrinterOrder, xPos: number, yPos: number): string {
  const maxSizeBarcode = '^BY2,2.5^FS';
  return `${maxSizeBarcode}^FT${xPos},${yPos}^BEB,120,Y,N ^FD${printerOrder.code}^FS^FS`;
}

export function getQrCodeZpl(printerOrder: PrinterOrder, xPos: number, yPos: number): string {
  return `^FT${xPos},${yPos}^BQN,2,6,L ^FD ^FDQA,${printerOrder.code}^FS^FS`;
}

export function getFolioZeroFieldZpl(xPos: number, yPos: number): string {
  return getZplField(xPos, yPos, 'F 0', 28);
}

export function buildTicketZpl(
  printerOrder: PrinterOrder,
  context: ZplLabelContext,
  setup: ZebraZplSetup,
  layout: ZplTicketLayout,
): string {
  const paperOffset = setup.paperType == PaperTypeEnum.pre_printed_paper ? prePrintedPaperOffset : 0;
  const bottomLimit = setup.paperType == PaperTypeEnum.pre_printed_paper ? bottomBase + paperOffset + 20 : bottomBase;
  let bottomOffset = 0;
  let topOffset = 0;
  let zpl = '';

  zpl += getEventInfoZpl(printerOrder, mainLeftLimit, 107 + paperOffset);
  zpl += getSessionInfoZpl(printerOrder, mainLeftLimit, 170 + paperOffset);
  zpl += getTicketsDetailZpl(printerOrder, mainLeftLimit, 250 + paperOffset, layout.isUnifiedTicket);
  zpl += getPurchaseInfoZpl(printerOrder, mainLeftLimit, bottomLimit, context.labels.purchasedAt);

  if (printerOrder.code) {
    if (printerOrder.codeType == CodeType.BARCODE) {
      zpl += getEan13BarcodeZpl(printerOrder, sideLeftLimit + 120, 280 + paperOffset);
      topOffset += 160;
    } else {
      zpl += getQrCodeZpl(printerOrder, sideLeftLimit, 160 + paperOffset);
      topOffset += 160;
    }
  }
  if (layout.isUnifiedTicket && printerOrder.totalOfTickets > 1) {
    zpl += getNumberOfTicketsZpl(printerOrder, sideLeftLimit, 100 + topOffset + paperOffset);
  }
  if (printerOrder.plan.termsAndConditionsQrImage) {
    zpl += getTermsAndConditionsZpl(printerOrder, sideLeftLimit, bottomLimit, context.labels.termsHeader);
    bottomOffset += 115;
  }
  const logo = getPartnerLogoZpl(printerOrder, context, sideLeftLimit, bottomLimit, bottomOffset);
  zpl += logo.zpl;
  bottomOffset = logo.bottomOffset + 25;
  zpl += getOrderInfoZpl(printerOrder, sideLeftLimit, bottomLimit - bottomOffset, context.labels.ticketId, context.labels.orderId);

  return generateZplTicket(zpl, layout.isLast, setup.hasCutter, setup.paperType);
}

export function buildFolioZeroTicketZpl(
  printerOrder: PrinterOrder,
  context: ZplLabelContext,
  setup: ZebraZplSetup,
  isLast: boolean,
): string {
  const paperOffset = setup.paperType == PaperTypeEnum.pre_printed_paper ? prePrintedPaperOffset : 0;
  const bottomLimit = setup.paperType == PaperTypeEnum.pre_printed_paper ? bottomBase + paperOffset + 20 : bottomBase;
  let topOffset = 0;
  let zpl = '';

  zpl += getEventInfoZpl(printerOrder, mainLeftLimit, 107 + paperOffset);
  zpl += getSessionInfoZpl(printerOrder, mainLeftLimit, 170 + paperOffset);
  zpl += getTicketsDetailZpl(printerOrder, mainLeftLimit, 250 + paperOffset, false);

  if (printerOrder.code) {
    if (printerOrder.codeType == CodeType.BARCODE) {
      zpl += getEan13BarcodeZpl(printerOrder, sideLeftLimit + 120, 280 + paperOffset);
      topOffset += 160;
    } else {
      zpl += getQrCodeZpl(printerOrder, sideLeftLimit, 160 + paperOffset);
      topOffset += 160;
    }
    zpl += getFolioZeroFieldZpl(sideLeftLimit, 100 + topOffset + paperOffset);
  }

  const logo = getPartnerLogoZpl(printerOrder, context, sideLeftLimit, bottomLimit, 0);
  zpl += logo.zpl;
  const bottomOffset = logo.bottomOffset + 25;
  zpl += getOrderInfoZpl(printerOrder, sideLeftLimit, bottomLimit - bottomOffset, context.labels.ticketId, context.labels.orderId);

  return generateZplTicket(zpl, isLast, setup.hasCutter, setup.paperType);
}
