import { inject, Injectable } from '@angular/core';

import { DelayedTicketReleaseFormGroup } from '@fz-original/app/modules/event-settings/components/delayed-ticket-release-section/delayed-ticket-release-section.types';
import {
  buildDurationBeforeTimeSlot,
  buildReleaseAtUtc,
  buildReleaseFrequencyFromForm,
  patchDelayedTicketReleaseFromRule,
  syncDelayedTicketReleaseValidators,
} from '@fz-original/app/modules/event-settings/components/delayed-ticket-release-section/delayed-ticket-release-section.utils';
import {
  CreateTicketReleaseRequest,
  TicketDeliverySettingsRule,
  UpsertTicketReleaseRequest,
} from '@fz-original/app/shared/ticket-delivery-settings/models/ticket-delivery-settings.model';
import { TicketDeliverySettingsService } from '@fz-original/app/shared/ticket-delivery-settings/ticket-delivery-settings.service';
import { getTimezoneFromRule } from '@fz-original/app/shared/ticket-delivery-settings/ticket-delivery-settings.utils';
import { map, Observable, of, switchMap, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TicketReleaseSettingsFacade {
  readonly #service = inject(TicketDeliverySettingsService);

  syncTicketReleaseIfDirty(
    partnerId: number,
    planId: number,
    formGroup: DelayedTicketReleaseFormGroup | null,
    rule: TicketDeliverySettingsRule | null,
    fallbackTimezone: string,
    fallbackFirstActiveTimeSlot: string | null,
    onRuleChanged: (rule: TicketDeliverySettingsRule | null) => void,
  ): Observable<void> {
    if (!formGroup || !formGroup.dirty) {
      return of(void 0);
    }

    const formValue = formGroup.getRawValue();
    const hasExistingRule = rule?.ticketReleaseSettings != null;
    const settingsId = formValue.settingsId;

    if (!formValue.enabled && hasExistingRule) {
      return this.#service
        .deleteTicketRelease(partnerId, planId)
        .pipe(
          switchMap(() => this.#refetchAndSync(partnerId, planId, formGroup, fallbackTimezone, fallbackFirstActiveTimeSlot, onRuleChanged)),
        );
    }

    if (!formValue.enabled) {
      return of(void 0);
    }

    if (!formGroup.valid) {
      return of(void 0);
    }

    const planTimezone = getTimezoneFromRule(rule, fallbackTimezone);
    const releaseFrequency = buildReleaseFrequencyFromForm(formValue);
    const releaseAt = buildReleaseAtUtc(formValue, planTimezone);
    const durationBeforeTimeSlot = buildDurationBeforeTimeSlot(formValue);

    if (settingsId) {
      const request: UpsertTicketReleaseRequest = {
        ticket_delivery_settings: {
          name: formValue.ruleName,
        },
        ticket_release_settings: {
          duration_before_time_slot: durationBeforeTimeSlot,
          is_seating_blocked: formValue.isSeatingBlocked,
          release_at: releaseAt,
          release_frequency: releaseFrequency,
        },
      };
      return this.#service
        .upsertTicketRelease(partnerId, settingsId, request)
        .pipe(
          switchMap(() => this.#refetchAndSync(partnerId, planId, formGroup, fallbackTimezone, fallbackFirstActiveTimeSlot, onRuleChanged)),
        );
    }

    const request: CreateTicketReleaseRequest = {
      ticket_delivery_settings: {
        main_plan_ids: [planId],
        name: formValue.ruleName,
      },
      ticket_release_settings: {
        duration_before_time_slot: durationBeforeTimeSlot,
        is_seating_blocked: formValue.isSeatingBlocked,
        release_at: releaseAt,
        release_frequency: releaseFrequency,
      },
    };
    return this.#service
      .createTicketRelease(partnerId, request)
      .pipe(
        switchMap(() => this.#refetchAndSync(partnerId, planId, formGroup, fallbackTimezone, fallbackFirstActiveTimeSlot, onRuleChanged)),
      );
  }

  #refetchAndSync(
    partnerId: number,
    planId: number,
    formGroup: DelayedTicketReleaseFormGroup,
    fallbackTimezone: string,
    fallbackFirstActiveTimeSlot: string | null,
    onRuleChanged: (rule: TicketDeliverySettingsRule | null) => void,
  ): Observable<void> {
    return this.#service.getSettings(partnerId, [planId]).pipe(
      tap(rules => {
        const freshRule = rules[0] ?? null;
        onRuleChanged(freshRule);

        if (freshRule) {
          patchDelayedTicketReleaseFromRule(formGroup, freshRule, fallbackTimezone);
        } else {
          const currentRuleName = formGroup.controls.ruleName.value;
          formGroup.reset();
          if (currentRuleName) {
            formGroup.controls.ruleName.setValue(currentRuleName);
          }
        }

        syncDelayedTicketReleaseValidators(formGroup, freshRule, fallbackTimezone, fallbackFirstActiveTimeSlot);
        formGroup.markAsPristine();
      }),
      map((): undefined => void 0),
    );
  }
}
