import { Injectable } from '@angular/core';

import {
  AllowedNumTickets,
  BulkUpdateSessionTypesDTO,
  InventorySessionTypeRulesDTO,
  NO_GROUP_OPTION_ID,
  NO_SELECTION_RULE_OPTION_ID,
  SessionTypeBulkEditFormValue,
  SessionTypeBulkEditProperty,
  SessionTypeBulkEditPropertyValue,
  SessionTypeBulkEditValues,
  SessionTypeSelectionRule,
} from '@fz-original/app/shared/services/sessions/session-type.model';

const NEEDED_SESSION_TYPE_MINIMUM = 1;
const NEEDED_SESSION_TYPE_MAXIMUM = 14;

@Injectable({
  providedIn: 'root',
})
export class BulkUpdateSessionTypesAdapter {
  toApi(formValue: SessionTypeBulkEditFormValue): BulkUpdateSessionTypesDTO {
    const { properties, sessionTypeIds, values } = formValue;
    const isEdited = (property: SessionTypeBulkEditPropertyValue): boolean => properties.includes(property);

    return {
      session_type_ids: sessionTypeIds,
      ...(isEdited(SessionTypeBulkEditProperty.productType) ? { product_type: this.#toNullableStringId(values.productType?.id) } : {}),
      ...(isEdited(SessionTypeBulkEditProperty.group) ? { group_id: this.#mapGroupId(values) } : {}),
      ...(isEdited(SessionTypeBulkEditProperty.instructions) ? { instructions: values.instructions ?? '' } : {}),
      ...(isEdited(SessionTypeBulkEditProperty.details) ? { details: values.details ?? '' } : {}),
      ...(isEdited(SessionTypeBulkEditProperty.label) ? { label: values.label ?? '' } : {}),
      ...(isEdited(SessionTypeBulkEditProperty.allowedNumTickets) ? { allowed_num_tickets: this.#mapAllowedNumTickets(values) } : {}),
      ...(isEdited(SessionTypeBulkEditProperty.targetAttendee)
        ? { target_attendee: this.#toNullableStringId(values.targetAttendee?.id) }
        : {}),
      ...(isEdited(SessionTypeBulkEditProperty.ticketTier) ? { ticket_tier: this.#mapTicketTier(values) } : {}),
      ...(isEdited(SessionTypeBulkEditProperty.selectionRule) ? { rules: this.#mapRules(values) } : {}),
    };
  }

  #mapAllowedNumTickets(values: SessionTypeBulkEditValues): AllowedNumTickets | null {
    const minimum = values.allowedNumTickets?.minimum;
    const maximum = values.allowedNumTickets?.maximum;

    if (minimum == null || maximum == null || String(minimum) === '' || String(maximum) === '') {
      return null;
    }

    return { maximum: Number(maximum), minimum: Number(minimum) };
  }

  #mapGroupId(values: SessionTypeBulkEditValues): number | null {
    const groupId = values.group?.id;
    if (groupId == null || groupId === NO_GROUP_OPTION_ID) {
      return null;
    }
    return Number(groupId);
  }

  #mapRules(values: SessionTypeBulkEditValues): InventorySessionTypeRulesDTO | null {
    const selectionRule = this.#toSelectionRule(values.rule?.selectionRule?.id);
    if (!selectionRule) {
      return null;
    }

    return {
      needed_session_types:
        selectionRule === SessionTypeSelectionRule.needsSessionType
          ? (values.rule?.neededSessionTypes?.map(option => ({
              max: NEEDED_SESSION_TYPE_MAXIMUM,
              min: NEEDED_SESSION_TYPE_MINIMUM,
              session_type: Number(option.id),
            })) ?? null)
          : null,
      selection_rule: selectionRule,
      visible_only_when_needed_session_types_selected: values.rule?.visibleOnlyWhenNeededSessionTypesSelected ?? false,
    };
  }

  #toNullableStringId(id: unknown): string | null {
    return typeof id === 'string' ? id : null;
  }

  #toSelectionRule(id: unknown): SessionTypeSelectionRule | null {
    if (id === NO_SELECTION_RULE_OPTION_ID) {
      return null;
    }

    if (
      id === SessionTypeSelectionRule.required ||
      id === SessionTypeSelectionRule.needsSessionType ||
      id === SessionTypeSelectionRule.standalone
    ) {
      return id;
    }

    return null;
  }

  #mapTicketTier(values: SessionTypeBulkEditValues): number | null {
    const ticketTier = values.ticketTier;
    if (ticketTier == null || String(ticketTier) === '') {
      return null;
    }
    return Number(ticketTier);
  }
}
