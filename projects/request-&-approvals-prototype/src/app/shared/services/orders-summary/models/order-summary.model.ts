import { Money } from '../../../models/money.model';
import { OrderPaymentMethod } from '../../../models/order/payment-method.enum';
import { OrderSummaryStatus } from './order-summary-status.model';
import { TicketBreakdownItem } from './ticket-breakdown-item.model';

export class OrderSummary {
  constructor(
    public orderId: string | null,
    public purchaseDate: string,
    public paymentMethod: OrderPaymentMethod,
    public fullName: string,
    public planName: string,
    public planDate: string,
    public total: Money,
    public placeTimezone: string,
    public placeName: string,
    public cityName: string,
    public channelId: string,
    public channelName: string,
    public ticketHolders: string[],
    public seats: string[],
    public ticketCount = 0,
    public ticketBreakdown: TicketBreakdownItem[] = [],
    public externalOrderId: string | null = null,
    public channelManagerOrderId: string | null = null,
    public loyaltyPoints: number | null = null,
    public paymentMethodName: string | null = null,
    public status: OrderSummaryStatus | null = null,
    public partnerTotal: Money | null = null,
  ) {}
}
