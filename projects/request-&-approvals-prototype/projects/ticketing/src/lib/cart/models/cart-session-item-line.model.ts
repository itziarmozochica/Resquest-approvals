export interface CartSessionItemLine {
  readonly mainPlanId: number | null;
  readonly parent: string | null;
  readonly sessionId: number;
  readonly id?: string;
}
