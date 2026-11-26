import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import {
  ApplicabilityContextRule,
  ApplicabilityContextRuleDTO,
} from '../../../../shared/models/capacity/time-slot-sessions-capacity-summary.model';
import {
  CapacityTemplate,
  CapacityTemplateApiGetResponse,
  CapacityTemplateForSessionType,
  CapacityTemplateForSessionTypeGetDTO,
  CapacityTemplateForSessionTypeGroup,
  CapacityTemplateForSessionTypeGroupGetDTO,
  CapacityTemplateGetDTO,
  CapacityTemplateQuota,
  CapacityTemplateQuotaDTO,
} from '../../shared/models/capacity-template.model';

@Injectable({
  providedIn: 'root',
})
export class CapacityTemplateGetAdapter implements AdapterInterface<CapacityTemplate[]> {
  fromApi(response: CapacityTemplateApiGetResponse): CapacityTemplate[] {
    return response.data.map(template => this.#transformCapacityTemplate(template));
  }

  #transformApplicabilityContext(dto: ApplicabilityContextRuleDTO[][] | null): ApplicabilityContextRule[][] | null {
    if (!dto) {
      return null;
    }
    return dto.map(
      ruleGroup =>
        ruleGroup.map(rule => ({
          fieldName: rule.field_name,
          operator: rule.operator,
          value: rule.value,
        })) as ApplicabilityContextRule[],
    );
  }

  #transformCapacityTemplate(dto: CapacityTemplateGetDTO): CapacityTemplate {
    return {
      capacityQuotas: (dto.capacity_quotas ?? []).map(quota => this.#transformQuota(quota)),
      groups: dto.groups.map(group => this.#transformCapacityTemplateGroup(group)),
      id: dto.id,
      isDefault: dto.is_default,
      isInUse: dto.is_in_use,
      mainPlanId: dto.main_plan_id,
      name: dto.name,
      timeslotCapacity: dto.time_slot_capacity,
    };
  }

  #transformCapacityTemplateGroup(dto: CapacityTemplateForSessionTypeGroupGetDTO): CapacityTemplateForSessionTypeGroup {
    return {
      assetActivityPackId: dto.activity_pack_id ?? null,
      capacity: dto.capacity,
      capacityFrequency: dto.capacity_frequency,
      capacityQuotas: (dto.capacity_quotas ?? []).map(quota => this.#transformQuota(quota)),
      id: dto.id,
      name: dto.name,
      sessionTypeGroupId: dto.session_type_group_id,
      sessionTypes: dto.session_types.map(sessionType => this.#transformCapacityTemplateSessionType(sessionType)),
    };
  }

  #transformCapacityTemplateSessionType(dto: CapacityTemplateForSessionTypeGetDTO): CapacityTemplateForSessionType {
    const sessionType: CapacityTemplateForSessionType = {
      capacity: dto.capacity,
      id: dto.id,
      ignoreTimeslotCapacity: dto.ignore_time_slot_capacity,
      isNew: dto.is_new,
      name: dto.name,
      sessionTypeId: dto.session_type_id,
      unlimitedAvailableTickets: dto.unlimited_available_tickets,
    };
    if (dto.capacity_quotas !== undefined) {
      sessionType.capacityQuotas = dto.capacity_quotas.map(quota => this.#transformQuota(quota));
    }
    return sessionType;
  }

  #transformQuota(dto: CapacityTemplateQuotaDTO): CapacityTemplateQuota {
    return {
      applicabilityContext: this.#transformApplicabilityContext(dto.applicability_context),
      capacity: dto.capacity,
      consumeMode: dto.consume_mode,
      name: dto.name,
    };
  }
}
