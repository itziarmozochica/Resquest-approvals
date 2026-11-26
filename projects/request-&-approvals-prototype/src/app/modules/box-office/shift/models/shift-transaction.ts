import { Money } from '../../../../shared/models/money.model';
import { OrderPaymentMethod } from '../../../../shared/models/order/payment-method.enum';

export enum ShiftTransactionAction {
  prepareCart = 'prepare_cart',
  cancelOrder = 'cancel_order',
  rescheduleOrder = 'reschedule_order',
  sale = 'sale',
  cancelSale = 'cancel_sale',
}

export const REFUNDING_SHIFT_TRANSACTION_ACTIONS: ReadonlyArray<ShiftTransactionAction> = [
  ShiftTransactionAction.cancelOrder,
  ShiftTransactionAction.cancelSale,
];

export interface ShiftTransactionOrderDTO {
  order_id: number;
  payment_method: OrderPaymentMethod;
  place_timezone: string;
  plan_date: string;
  plan_name: string;
  ticket_count: number;
  total: {
    amount: number;
    currency: string;
  };
}

export interface ShiftTransactionDTO {
  action: ShiftTransactionAction;
  full_name: string;
  order_id: number;
  orders: ShiftTransactionOrderDTO[];
  payment_method: OrderPaymentMethod;
  payment_method_name?: string | null;
  place_timezone: string;
  plan_date: string;
  plan_name: string;
  ticket_count: number;
  total: {
    amount: number;
    currency: string;
  };
  transaction_date: string;
}

export interface ShiftTransactionOrder {
  orderId: number;
  planDate: Date;
  planName: string;
  ticketCount: number;
  total: Money;
}

export interface ShiftTransaction {
  action: ShiftTransactionAction;
  fullName: string;
  orders: ShiftTransactionOrder[];
  paymentMethod: OrderPaymentMethod;
  paymentMethodName: string | null;
  placeTimezone: string;
  ticketCount: number;
  total: Money;
  transactionDate: Date;
}
