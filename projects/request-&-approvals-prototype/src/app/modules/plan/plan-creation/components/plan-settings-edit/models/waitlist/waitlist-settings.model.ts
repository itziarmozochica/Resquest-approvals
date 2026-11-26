export interface WaitlistSettings {
  automaticRedirection: boolean;
  presaleClosesAt: Date | null;
  targetPlanId: number | null;
  waitlistClosesAt: Date | null;
}

export interface WaitlistSettingsData {
  automatic_redirections: boolean;
  created_at?: string;
  id?: string;
  presale_closes_at: string | null;
  target_main_plan_id: number | null;
  updated_at?: string;
  waitlist_closes_at: string | null;
  waitlist_main_plan_id?: number;
}
