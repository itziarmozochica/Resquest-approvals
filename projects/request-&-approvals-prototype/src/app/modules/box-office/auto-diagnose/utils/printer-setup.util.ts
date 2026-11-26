import { OboPrinterTypeEnum, OnsiteSetup, ReceiptPrinterType } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';

import { DiagnoseTileDetail } from '../models/auto-diagnose.model';
import { TicketPrinterSetup } from '../models/printer-diagnose.model';

const PRINTER_KEY_PREFIX = 'boxOffice.autoDiagnose.printer.';

export function toTicketPrinterSetup(setup: OnsiteSetup | null, appVersion: string | null): TicketPrinterSetup | null {
  if (setup?.obo_printer_type !== OboPrinterTypeEnum.zebra_printer_v2) {
    return null;
  }

  return { appVersion, cutterType: setup.cutter_type ?? null, paperType: setup.paper_type ?? null };
}

export function hasReceiptPrinter(setup: OnsiteSetup | null): boolean {
  return setup?.receipt_printer_type === ReceiptPrinterType.epson;
}

export function toPrinterDetails(setup: OnsiteSetup): DiagnoseTileDetail[] {
  const zebraDetails: DiagnoseTileDetail[] =
    setup.obo_printer_type === OboPrinterTypeEnum.zebra_printer_v2
      ? [
          {
            labelKey: `${PRINTER_KEY_PREFIX}paper`,
            translateValue: true,
            value: `${PRINTER_KEY_PREFIX}paperTypes.${setup.paper_type ?? 'unknown'}`,
          },
          {
            labelKey: `${PRINTER_KEY_PREFIX}cutter`,
            translateValue: true,
            value: `${PRINTER_KEY_PREFIX}cutterTypes.${setup.cutter_type ?? 'unknown'}`,
          },
        ]
      : [];

  return [
    {
      labelKey: `${PRINTER_KEY_PREFIX}ticketPrinter`,
      translateValue: true,
      value: `${PRINTER_KEY_PREFIX}ticketTypes.${setup.obo_printer_type ?? OboPrinterTypeEnum.no_printer}`,
    },
    ...zebraDetails,
    {
      labelKey: `${PRINTER_KEY_PREFIX}receiptPrinter`,
      translateValue: true,
      value: `${PRINTER_KEY_PREFIX}receiptTypes.${setup.receipt_printer_type ?? 'none'}`,
    },
  ];
}
