import { CartB2bEmployeeRequestBody } from '../../models/cart/cart-session-manual-price.model';
import { CartSession } from '../../models/cart/cart-session.model';
import { Channel } from '../session-availability/channel.enum';
import { ReschedulePaidBy } from './reschedule-paid-by.enum';

export interface CreateCartQuery {
  channel: Channel;
  bundleIds?: number[];
  channelId?: string;
  hasSeating?: boolean;
  isRealTimeSeating?: boolean;
  locale?: string;
  overrideCapacity?: boolean;
  partnerId: number;
  rescheduleOrderId?: number;
  reschedulePaidBy?: ReschedulePaidBy;
  seatingToken?: string | null;
  seatingHoldTokensBySessionId?: Map<string, string>;
  sessionItemsByDatetime: Map<string, CartSession[]>;
  useSessionItemLines?: boolean;
  /** Sent as `b2b_employee` whenever the body carries `manual_prices`. */
  actingEmployee?: CartB2bEmployeeRequestBody;
  /** Add-on sessions travel as unpriced lines instead of forcing the `session_items` shape (reservation flow only). */
  allowAddOnLines?: boolean;
}

/** The line options a ticketing flow adds to its create and update queries. */
export type CartLinesQueryOptions = Pick<CreateCartQuery, 'actingEmployee' | 'allowAddOnLines' | 'useSessionItemLines'>;
