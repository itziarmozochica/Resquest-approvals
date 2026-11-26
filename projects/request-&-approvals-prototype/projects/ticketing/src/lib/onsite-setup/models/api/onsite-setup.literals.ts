export type ContactInformationField = 'email' | 'phone';

export type ContactInformationOrderableField = 'email' | 'first_name' | 'last_name' | 'phone';

export type ContactInformationRequirement = 'disabled' | 'optional' | 'required';

export type CutterType = 'basic-cutter' | 'none';

export type OboFlowType = 'all_steps' | 'one_step' | 'one_stop_shop';

export type OboPrinterType = 'adyen_printer' | 'no_printer' | 'zebra_printer' | 'zebra_printer_v2';

export type OnsiteDeviceType = 'box-office' | 'kiosk' | 'mobile-pos';

export type OnsiteSetupPaymentGateway =
  | 'adyen'
  | 'delegated'
  | 'fever'
  | 'free'
  | 'globalpayments'
  | 'payhere'
  | 'razorpay'
  | 'square'
  | 'stripe'
  | 'undefined';

export type OssCustomTabType = 'parent_hierarchy_element' | 'specific_items';

export type PaperType = 'basic-paper' | 'pre-printed-paper';

export type PriceViewer = 'bixolodon-bdc-2000' | 'none';

export type ReceiptPrinterType = 'adyen' | 'epson';

export type SessionAvailabilityCacheStrategy = 'no_cache' | 'stale_while_revalidate' | 'time_to_live';

export type ShiftStrategy = 'disabled' | 'mandatory' | 'optional';

export type TicketSelectorType = 'party_members' | 'standard';

export type TicketValidationType = 'autovalidation' | 'manual_validation' | 'no_validation';

export const OBO_PRINTER_TYPE_NONE = 'no_printer' satisfies OboPrinterType;

export const OBO_PRINTER_TYPE_ZEBRA = 'zebra_printer' satisfies OboPrinterType;

export const ONSITE_SETUP_DEVICE_TYPE_BOX_OFFICE = 'box-office' satisfies OnsiteDeviceType;
