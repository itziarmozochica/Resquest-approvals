export interface OrderResponsesSummary {
  buyerEmail: string;
  buyerName: string;
  isGuest: boolean;
  orderDate: string | null;
  phone: string;
  reference: string;
  ticketCount: number;
}
