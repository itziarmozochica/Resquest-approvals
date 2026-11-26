import { BaseErrorResponse } from '../../../../shared/models/base-response';
import {
  ApplicabilityContextRule,
  ApplicabilityContextRuleDTO,
  CapacityQuotaConsumeMode,
} from '../../../../shared/models/capacity/time-slot-sessions-capacity-summary.model';

export interface CapacityTemplateQuota {
  applicabilityContext: ApplicabilityContextRule[][] | null;
  capacity: number;
  consumeMode: CapacityQuotaConsumeMode;
  name: string;
}

export interface CapacityTemplateQuotaDTO {
  applicability_context: ApplicabilityContextRuleDTO[][] | null;
  capacity: number;
  consume_mode: CapacityQuotaConsumeMode;
  name: string;
}

export interface CapacityTemplate {
  capacityQuotas: CapacityTemplateQuota[];
  groups: CapacityTemplateForSessionTypeGroup[];
  id: string | null;
  isDefault: boolean;
  /** Whether a calendar uses the template. Unknown (undefined) counts as in use. */
  isInUse?: boolean;
  mainPlanId: number;
  name: string;
  timeslotCapacity: number | null;
}

export interface CapacityTemplateForSessionTypeGroup {
  assetActivityPackId: number | null;
  capacity: number | null;
  capacityFrequency: string | null;
  capacityQuotas: CapacityTemplateQuota[];
  id: string | null;
  name: string | null;
  sessionTypeGroupId: number | null;
  sessionTypes: CapacityTemplateForSessionType[];
}

export interface CapacityTemplateForSessionType {
  capacity: number | null;
  capacityQuotas?: CapacityTemplateQuota[];
  id: string | null;
  ignoreTimeslotCapacity: boolean | null;
  isNew: boolean;
  name: string;
  sessionTypeId: number;
  unlimitedAvailableTickets: boolean | null;
}

export interface GroupCapacityTemplateValues {
  groupId: number | null;
  groupName: string;
  assetActivityPackId: number | null;
  capacityTemplateValues: CapacityTemplateValueWithQuotaSum[];
  sessionTypes: SessionTypeCapacityTemplateValues[];
  maxCapacity: number | null;
}

export interface SessionTypeCapacityTemplateValues {
  sessionTypeId: number | null;
  sessionTypeLabel: string;
  isNew: boolean;
  capacityTemplateValues: CapacityTemplateValueWithQuotaSum[];
}

export interface CapacityTemplateValue {
  templateId: string;
  capacity: number | null;
  unlimited: boolean;
}

/**
 * Input variant of `CapacityTemplateValue` used by the inline editing rows of
 * `capacity-templates-table`. Carries the sum of capacities of the quotas
 * associated to the same level (template / group / session type) so that each
 * row can validate the typed capacity against that minimum. The output emitted
 * by the rows remains `CapacityTemplateValue` (without `quotaCapacitySum`).
 */
export type CapacityTemplateValueWithQuotaSum = CapacityTemplateValue & {
  quotaCapacitySum: number;
};

export interface CapacityTemplateApiGetResponse {
  data: CapacityTemplateGetDTO[];
}

export interface CapacityTemplateGetDTO {
  capacity_quotas: CapacityTemplateQuotaDTO[];
  groups: CapacityTemplateForSessionTypeGroupGetDTO[];
  id: string;
  is_default: boolean;
  is_in_use?: boolean;
  main_plan_id: number;
  name: string;
  time_slot_capacity: number | null;
}

export interface CapacityTemplateForSessionTypeGroupGetDTO {
  activity_pack_id: number | null;
  capacity: number | null;
  capacity_frequency: string | null;
  capacity_quotas: CapacityTemplateQuotaDTO[];
  id: string | null;
  name: string | null;
  session_type_group_id: number | null;
  session_types: CapacityTemplateForSessionTypeGetDTO[];
}

export interface CapacityTemplateForSessionTypeGetDTO {
  capacity: number | null;
  capacity_quotas?: CapacityTemplateQuotaDTO[];
  id: string | null;
  ignore_time_slot_capacity: boolean | null;
  is_new: boolean;
  name: string;
  session_type_id: number;
  unlimited_available_tickets: boolean | null;
}

export interface CapacityTemplateUpdateData {
  capacity_template: CapacityTemplateUpdateDTO;
  capacity_for_session_types: CapacityForSessionTypeUpdateDTO[];
  capacity_for_session_type_groups: CapacityForSessionTypeGroupUpdateDTO[];
}

export interface CapacityTemplateApiUpdateResponse {
  data: CapacityTemplateUpdateData | null;
  error: BaseErrorResponse | null;
}

export interface CapacityTemplateUpdateRequestBody {
  capacity_template: CapacityTemplateUpdateDTO;
  capacity_for_session_types: CapacityForSessionTypeUpdateDTO[];
  capacity_for_session_type_groups: CapacityForSessionTypeGroupUpdateDTO[];
}

export interface CapacityTemplateUpdateDTO {
  capacity_quotas: CapacityTemplateQuotaDTO[];
  id: string | null;
  is_default: boolean;
  name: string;
  time_slot_capacity: number | null;
}

export interface CapacityForSessionTypeUpdateDTO {
  capacity: number;
  capacity_quotas?: CapacityTemplateQuotaDTO[];
  capacity_template_id: string | null;
  id: string | null;
  ignore_time_slot_capacity: boolean;
  session_type_id: number;
  unlimited_available_tickets: boolean;
}

export interface CapacityForSessionTypeGroupUpdateDTO {
  capacity: number;
  capacity_quotas: CapacityTemplateQuotaDTO[];
  capacity_template_id: string | null;
  id: string | null;
  session_type_group_id: number;
}
