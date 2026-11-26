export interface CartSeatRequestApi {
  label: string;
  reference: string;
}

export interface CartSessionItemRequestApi {
  session_id: number;
  units: number;
  main_plan_id?: number;
  seating_hold_token?: string;
  seats?: CartSeatRequestApi[];
}

export interface CartSessionItemLineRequestApi {
  parent: string | null;
  session_id: number;
  id?: string;
  main_plan_id?: number;
}

interface CartSessionItemsRequestApi {
  session_items: CartSessionItemRequestApi[];
}

interface CartSessionItemLinesRequestApi {
  session_item_lines: CartSessionItemLineRequestApi[];
}

export type CreateCartRequestApi = {
  bundle_ids?: number[];
  channel?: string;
  override_capacity?: boolean;
} & (CartSessionItemsRequestApi | CartSessionItemLinesRequestApi);

export type UpdateCartRequestApi = {
  bundle_ids?: number[];
  override_capacity?: boolean;
} & (CartSessionItemsRequestApi | CartSessionItemLinesRequestApi);

export interface CartActorApi {
  b2b_user_email: string | null;
  b2b_user_id: number | null;
  b2b_user_interface: string | null;
  b2b_user_name: string | null;
  b2b_user_username: string | null;
}

export interface CartCustomerApi {
  city: number | null;
  email: string | null;
  terms: string[];
  first_name?: string | null;
  last_name?: string | null;
}

export interface PrepareCartRequestApi {
  b2b_user: CartActorApi;
  user: CartCustomerApi;
  channel_id?: string;
  [field: string]: unknown;
}
