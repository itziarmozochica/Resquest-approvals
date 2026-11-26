import { PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';

import { ContactInformationSetup, OnsiteSetupPlace, PaymentMethodSetup } from './onsite-setup';

export enum KioskPrinterCutConfiguration {
  PARTIAL_CUT = 'partial_cut',
  FULL_CUT = 'full_cut',
}

export interface KioskOnsiteSetupDTO {
  id: string;
  name: string;
  location_id: string;
  place?: OnsiteSetupPlace;
  max_purchasable_days: number;
  hide_plan_name: boolean;
  show_qr: boolean;
  print_tickets_combined?: boolean;
  show_manage_booking?: boolean;
  printer_cut_configuration: KioskPrinterCutConfiguration;
  payment_methods?: PaymentMethodSetup[];
  kiosk_payment_gateway: PaymentCheckoutET;
  payment_extra_information: string;
  available_languages: string[];
  contact_information_setup: ContactInformationSetup;
  square_location_id?: string;
  square_application_id?: string;
}

export type KioskOnsiteSetup = KioskOnsiteSetupDTO;

export interface KioskOnsiteSetupBody {
  name: string;
  max_purchasable_days: number;
  hide_plan_name: boolean;
  show_qr: boolean;
  print_tickets_combined?: boolean;
  show_manage_booking?: boolean;
  printer_cut_configuration: string;
  payment_methods?: PaymentMethodSetup[];
  kiosk_payment_gateway: PaymentCheckoutET;
  payment_extra_information: string;
  available_languages: string[];
  contact_information_setup: ContactInformationSetup;
  square_location_id?: string;
  square_application_id?: string;
}
