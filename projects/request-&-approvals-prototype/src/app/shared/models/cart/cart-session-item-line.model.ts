export interface CartSessionItemLineData {
  main_plan_id: number | null;
  parent: string | null;
  session_id: number;
  id?: string;
}

export interface CartSessionItemLine {
  mainPlanId: number | null;
  parent: string | null;
  sessionId: number;
  id?: string;
}

export interface CartSessionItemLineRequestBody {
  parent: string | null;
  session_id: number;
  id?: string;
  main_plan_id?: number;
  /** Manual price per ticket (GAME-1722): absent keeps the backend's, `null` clears it. Never `ticket_price`. */
  manual_ticket_price?: number | null;
}

export interface CartSessionItemLineEligibilityOptions {
  /** The reservation flow sends add-ons as unpriced lines; box office keeps them out of the lines shape. */
  allowAddOns?: boolean;
}
