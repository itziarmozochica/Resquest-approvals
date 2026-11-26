import { Cart } from '@fz-original/app/shared/models/cart/cart.model';

import { Order } from '../../../shared/models/order/order.model';
import { Reservation } from './reservation.model';

export interface ReservationDetail {
  orders: Order[];
  reservationData: Reservation;
  order?: Order;
  cart?: Cart;
}
