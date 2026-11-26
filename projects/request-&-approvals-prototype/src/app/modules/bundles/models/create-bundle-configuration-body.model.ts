import { BundleFlow } from '@fz-original/app/modules/bundles/models/bundle-flow.model';

export interface CreateBundleConfigurationBodyBundle {
  main_plan_id: number;
  order: number;
  is_active: boolean;
  color: string | null;
  session_type_discounts: [];
}

interface CreateBundleConfigurationBodyContent {
  max_date_selection_span_in_days: 0 | null;
  session_offset_minutes: number | null;
  flow: BundleFlow;
  min_bundle_size: number | null;
  max_bundle_size: number | null;
  related_main_plans: CreateBundleConfigurationBodyBundle[];
  type: string;
}

export interface CreateBundleConfigurationBody {
  bundle_configuration: CreateBundleConfigurationBodyContent;
}
