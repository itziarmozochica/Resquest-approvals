import { CustomerType } from './customer-type.enum';

export interface Customer {
  id?: number;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  cityStandardId?: number;
  acceptedTerms?: string[];
  type?: CustomerType;
}

export interface CustomerApiPayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  city?: number;
  terms?: string[];
  channel_id?: string;
}
