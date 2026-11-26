export interface CartSessionTypeUpgradeBaseData {
  add_on_options_count: number;
  add_on_source_session_ids: number[];
  add_on_target_session_ids: number[];
  cart_id: string;
  currency: string;
  options_count: number;
  source_session_ids: number[];
  target_session_ids: number[];
  total_delta: number;
  total_units: number;
  upgrade_id: number;
  upgrade_scheduling_days: number;
  upgrade_title: string;
}

export type CartSessionTypeUpgradeShownData = CartSessionTypeUpgradeBaseData;

export interface CartSessionTypeUpgradeAppliedData extends CartSessionTypeUpgradeBaseData {
  apply_requests_count: number;
}

export type CartSessionTypeUpgradeDismissMethod = 'add_button' | 'close_button' | 'skip_button';

export interface CartSessionTypeUpgradeSkippedData extends CartSessionTypeUpgradeBaseData {
  dismiss_method: CartSessionTypeUpgradeDismissMethod;
}
