import { CartAdjustmentPrice, CartAdjustmentPriceData } from '../../cart/models/cart-adjustment-price.model';
import { Customer } from '../../models/customer/customer.model';
import { User } from '../../models/user/user.model';

export interface PrepareCartQuery {
  partnerId: number;
  cartId: string;
  userId?: number;
  planId?: number;
  placeId: number;
  onsiteSetupId?: string;
  channel?: string;
  user?: User;
  kioskSerialNumber?: string;
  customer?: Customer;
  overrideCapacity?: boolean;
}

export interface PrepareCartForCustomerQuery extends Omit<PrepareCartQuery, 'customer' | 'userId'> {
  customer: Customer;
}

export interface PrepareCartQueryV2 {
  partnerId: number;
  cartId: string;
  planId?: number;
  placeId: number;
  onsiteSetupId?: string;
  channel?: string;
  user?: User;
  kioskSerialNumber?: string;
  customer?: Customer;
  adjustment?: CartAdjustmentPrice;
}

export interface B2BUserPrepareCarBody {
  b2b_user_id: number | null;
  b2b_user_email: string | null;
  b2b_user_name: string | null;
  b2b_user_username: string | null;
  b2b_user_interface: string | null;
}

export interface UserPrepareCarBody {
  email: string | null;
  city: number | null;
  terms: string[];
  first_name?: string | null;
  last_name?: string | null;
}

export interface PrepareCarBody {
  b2b_user: B2BUserPrepareCarBody;
  onsite_setup_id?: string;
  channel_id?: string;
  user_id?: number;
  kiosk_serial_number?: string;
  override_capacity?: boolean;
}

export interface PrepareCartCustomerBody {
  terms: string[];
  city?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

export interface PrepareCartForCustomerBody extends PrepareCarBody {
  user?: PrepareCartCustomerBody;
}

export interface PrepareCartBodyV2 {
  b2b_user: B2BUserPrepareCarBody;
  onsite_setup_id?: string;
  channel_id?: string;
  kiosk_serial_number?: string;
  user?: UserPrepareCarBody;
  adjustment?: CartAdjustmentPriceData;
}
