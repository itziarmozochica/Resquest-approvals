export interface PrintingFinished {
  success: boolean;
  orderId: number | null;
  reason: string | null;
}
