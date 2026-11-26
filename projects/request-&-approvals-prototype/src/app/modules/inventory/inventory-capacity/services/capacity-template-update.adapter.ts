import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '../../../../shared/models/base-response';
import { ApplicabilityContextRule } from '../../../../shared/models/capacity/time-slot-sessions-capacity-summary.model';
import {
  CapacityForSessionTypeGroupUpdateDTO,
  CapacityForSessionTypeUpdateDTO,
  CapacityTemplate,
  CapacityTemplateApiUpdateResponse,
  CapacityTemplateQuota,
  CapacityTemplateQuotaDTO,
  CapacityTemplateUpdateData,
  CapacityTemplateUpdateRequestBody,
} from '../../shared/models/capacity-template.model';

@Injectable({
  providedIn: 'root',
})
export class CapacityTemplateUpdateAdapter {
  fromApi(response: CapacityTemplateApiUpdateResponse): BaseResponse<CapacityTemplateUpdateData | null> {
    return new BaseResponse<CapacityTemplateUpdateData | null>(response.data, this.#getError(response.error));
  }

  toApi(capacityTemplate: CapacityTemplate): CapacityTemplateUpdateRequestBody {
    const capacityForSessionTypes: CapacityForSessionTypeUpdateDTO[] = [];
    const capacityForSessionTypeGroups: CapacityForSessionTypeGroupUpdateDTO[] = [];

    capacityTemplate.groups.forEach(group => {
      if (this.#shouldSendCapacity(group.capacity) && group.sessionTypeGroupId !== null) {
        capacityForSessionTypeGroups.push({
          capacity: group.capacity as number,
          capacity_quotas: this.#transformQuotas(group.capacityQuotas),
          capacity_template_id: capacityTemplate.id,
          id: group.id,
          session_type_group_id: group.sessionTypeGroupId,
        });
      }

      group.sessionTypes.forEach(sessionType => {
        if (this.#shouldSendCapacity(sessionType.capacity)) {
          const sessionTypePayload: CapacityForSessionTypeUpdateDTO = {
            capacity: sessionType.capacity as number,
            capacity_template_id: capacityTemplate.id,
            id: sessionType.id,
            ignore_time_slot_capacity: sessionType.ignoreTimeslotCapacity || false,
            session_type_id: sessionType.sessionTypeId,
            unlimited_available_tickets: sessionType.unlimitedAvailableTickets || false,
          };
          if (sessionType.capacityQuotas && sessionType.capacityQuotas.length > 0) {
            sessionTypePayload.capacity_quotas = this.#transformQuotas(sessionType.capacityQuotas);
          }
          capacityForSessionTypes.push(sessionTypePayload);
        }
      });
    });

    return {
      capacity_template: {
        capacity_quotas: this.#transformQuotas(capacityTemplate.capacityQuotas),
        id: capacityTemplate.id,
        is_default: capacityTemplate.isDefault,
        name: capacityTemplate.name,
        time_slot_capacity: capacityTemplate.timeslotCapacity,
      },
      capacity_for_session_types: capacityForSessionTypes,
      capacity_for_session_type_groups: capacityForSessionTypeGroups,
    };
  }

  #getError(error: BaseErrorResponse | null): BaseErrorResponse | null {
    if (error === null) {
      return null;
    }
    return { code: error.code, message: error.message, error: error.error, errorCode: error.errorCode };
  }

  #shouldSendCapacity(capacity: number | null): boolean {
    return capacity !== null && capacity > 0;
  }

  #transformApplicabilityContext(context: ApplicabilityContextRule[][] | null): CapacityTemplateQuotaDTO['applicability_context'] {
    if (!context) {
      return null;
    }
    return context.map(ruleGroup =>
      ruleGroup.map(rule => ({
        field_name: rule.fieldName,
        operator: rule.operator,
        value: rule.value,
      })),
    );
  }

  #transformQuotas(quotas: CapacityTemplateQuota[]): CapacityTemplateQuotaDTO[] {
    return quotas.map(quota => ({
      applicability_context: this.#transformApplicabilityContext(quota.applicabilityContext),
      capacity: quota.capacity,
      consume_mode: quota.consumeMode,
      name: quota.name,
    }));
  }
}
