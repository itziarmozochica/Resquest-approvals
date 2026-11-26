import { formatCurrency, getCurrencySymbol } from '@angular/common';

import { formatLocalFullDate } from '@fz-original/app/shared/components/date-selector/date-selector.util';
import { CodeType } from '@fz-original/app/shared/models/order/code-type.model';
import { SessionTypeCatalogItem } from '@fz-original/app/shared/services/sessions/session-type-catalog.model';
import moment from 'moment-timezone';

import { folioZeroCode, PrinterOrder } from '../models/order/printer-order.model';
import { FolioZeroPrintPreview } from '../services/zebra-zpl-print/models/folio-zero-print-preview.model';

const FOLIO_ZERO_ORDER_ID = 'R000000000';
const FOLIO_ZERO_TICKET_ID = 123;

/** Wide currency symbol (CurrencyPipe `symbol`). MXN uses MX$ as in Feverzone. */
function formatFolioZeroPrice(amount: number, currency: string, locale: string): string {
  const symbol = currency === 'MXN' ? 'MX$' : getCurrencySymbol(currency, 'wide', locale);

  return formatCurrency(amount, locale, symbol, currency);
}

export interface FolioZeroPrinterOrderLabels {
  locale: string;
}

export function buildFolioZeroPrinterOrder(
  preview: FolioZeroPrintPreview,
  sessionType: SessionTypeCatalogItem,
  labels: FolioZeroPrinterOrderLabels,
): PrinterOrder {
  const { locale } = labels;
  const timezone = preview.timezone || 'UTC';
  const startMoment = moment.utc(preview.printDateTime).tz(timezone);
  const startsAtDate = formatLocalFullDate(preview.printDateTime, locale, timezone);
  const startsAtTime = startMoment.format('HH:mm');
  const basePrice = sessionType.basePrice ?? 0;
  const formattedPrice = formatFolioZeroPrice(basePrice, preview.currency, locale);

  return {
    code: folioZeroCode,
    codeType: CodeType.QR,
    createdAt: '',
    orderId: FOLIO_ZERO_ORDER_ID,
    plan: {
      id: preview.planId,
      name: preview.planName,
      sessionSelectorType: 'timeslot',
      termsAndConditionsQrImage: '',
    },
    pricing: {
      totalFirstRow: formattedPrice,
      totalSecondRow: '',
    },
    session: {
      address: preview.placeAddress,
      isoCountryCode: preview.isoCountryCode,
      name: preview.placeName,
      startsAtDate,
      startsAtDateShortFormat: startMoment.format('DD/MM/YYYY'),
      startsAtTime,
      timezone,
    },
    ticketId: FOLIO_ZERO_TICKET_ID,
    tickets: [{ label: sessionType.label, numberOfTickets: 1, seats: [], timeGranularity: null }],
    totalOfTickets: 1,
  };
}
