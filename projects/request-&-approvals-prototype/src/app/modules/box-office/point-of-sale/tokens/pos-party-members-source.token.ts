import { InjectionToken, type Signal } from '@angular/core';

import { type TicketSelectorTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';

import { type PosPartyDay } from '../models/store/pos-party-members.feature.model';

export interface PosPartyMembersSource {
  readonly isFreeSeatingMap: Signal<boolean>;
  readonly loadedDay: Signal<PosPartyDay | null>;
  readonly selectedDate: Signal<string | null>;
  readonly ticketSelectorType: Signal<TicketSelectorTypeEnum | null>;
  readonly timeZone: Signal<string>;
}

export const POS_PARTY_MEMBERS_SOURCE = new InjectionToken<PosPartyMembersSource>('POS_PARTY_MEMBERS_SOURCE');
