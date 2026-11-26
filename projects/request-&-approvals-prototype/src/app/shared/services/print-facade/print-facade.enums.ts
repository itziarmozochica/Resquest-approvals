import { PrinterDocumentType } from '@fz-original/app/modules/kiosk/services/printer/models/printer-instruction.model';

export { FeverzoneDeviceType } from '@fz-original/app/shared/models/device/device.model';

export enum PrintDocumentType {
  cash_integration = 'cash_integration',
  fiscal_receipt = 'fiscal_receipt',
  folio_zero = 'folio_zero',
  france_duplicate = 'france_duplicate',
  gift_aid = 'gift_aid',
  receipt = 'receipt',
  refund = 'refund',
  ticket = 'ticket',
}

export enum PrintPrinterType {
  adyen = 'adyen',
  browser_pdf = 'browser_pdf',
  efsta_efr = 'efsta_efr',
  epson = 'epson',
  no_printer = 'no_printer',
  zebra = 'zebra',
}

export enum PrintEntryPoint {
  box_office_order_open_ticket = 'BoxOfficeOrderComponent.openTicket',
  box_office_order_print_adyen = 'BoxOfficeOrderComponent.printAdyen',
  box_office_order_print_orders = 'BoxOfficeOrderComponent.printOrders',
  cancellation_print_adyen_receipt = 'CancellationComponent.printReceipt',
  cancellation_print_epson_receipt = 'CancellationComponent.printEpsonReceipt',
  folio_zero_execute_print = 'FolioZeroPrintSideSheetComponent.executePrint',
  invitations_print_order = 'InvitationsTicketingComponent.printOrder',
  order_card_print_adyen = 'OrderCardComponent.printAdyen',
  order_card_print_epson_receipt = 'OrderCardComponent.printEpsonReceipt',
  order_card_print_orders = 'OrderCardComponent.printOrders',
  order_card_reprint_efsta = 'OrderCardComponent.reprintEfstaFiscalReceipt',
  purchased_cart_open_tickets = 'PurchasedCartComponent.openTickets',
  purchased_cart_print_adyen = 'PurchasedCartComponent.printAdyen',
  purchased_cart_print_epson_receipt = 'PurchasedCartComponent.printEpsonReceipt',
  purchased_cart_print_orders = 'PurchasedCartComponent.printOrders',
  purchased_cart_reprint_efsta = 'PurchasedCartComponent.reprintEfstaFiscalReceipt',
  reschedule_print_order = 'RescheduleOrderComponent.printOrder',
  reschedule_print_ticket = 'RescheduleOrderComponent.printTicket',
}

const PRINTER_DOCUMENT_TYPE_TO_PRINT_DOCUMENT_TYPE: Record<PrinterDocumentType, PrintDocumentType> = {
  [PrinterDocumentType.cash_integration]: PrintDocumentType.cash_integration,
  [PrinterDocumentType.gift_aid]: PrintDocumentType.gift_aid,
  [PrinterDocumentType.receipt]: PrintDocumentType.receipt,
  [PrinterDocumentType.refund]: PrintDocumentType.refund,
  [PrinterDocumentType.ticket]: PrintDocumentType.ticket,
};

export function toPrintDocumentType(documentType: PrinterDocumentType): PrintDocumentType {
  return PRINTER_DOCUMENT_TYPE_TO_PRINT_DOCUMENT_TYPE[documentType];
}
