import type {
  MultiStepActionConfig,
  MultiStepChromeConfig,
  MultiStepModalConfig,
  MultiStepStepConfig,
} from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';

import {
  POS_PARTY_HANDHELD_SHEET,
  type PosPartyHandheldContext,
  type PosPartyHandheldIntent,
  type PosPartyHandheldSheet,
} from '../models/pos-party-handheld-modal.model';
import { hasPartyDraft } from '../utils/pos-party-handheld-draft.util';

type PosPartyHandheldModalConfigs = {
  readonly [TSheet in PosPartyHandheldSheet]: MultiStepModalConfig<PosPartyHandheldContext, TSheet, PosPartyHandheldIntent>;
};

type PosPartyHandheldStepConfig<TSheet extends PosPartyHandheldSheet> = MultiStepStepConfig<
  PosPartyHandheldContext,
  TSheet,
  PosPartyHandheldIntent
>;

const sheetChrome: MultiStepChromeConfig<PosPartyHandheldContext> = {
  disableClose: false,
  showBack: false,
  showClose: false,
  showProgress: false,
};

const cancelAction: MultiStepActionConfig<PosPartyHandheldContext, PosPartyHandheldIntent> = {
  id: 'cancel',
  intent: 'cancel',
  kind: 'secondary',
  labelKey: 'common.cancel',
  placement: 'leading',
};

const dateStep: PosPartyHandheldStepConfig<'date'> = {
  actions: [cancelAction, { id: 'apply', intent: 'close', kind: 'primary', labelKey: 'common.apply' }],
  chrome: sheetChrome,
  id: POS_PARTY_HANDHELD_SHEET.Date,
  loader: () => import('../steps/date/pos-party-date-step.component').then(m => m.PosPartyDateStepComponent),
  titleKey: 'boxOffice.partyMembers.handheld.selectDate',
  transitions: [],
};

const partyStep: PosPartyHandheldStepConfig<'party'> = {
  actions: [cancelAction, { enabledWhen: hasPartyDraft, id: 'apply', intent: 'close', kind: 'primary', labelKey: 'common.apply' }],
  chrome: sheetChrome,
  id: POS_PARTY_HANDHELD_SHEET.Party,
  loader: () => import('../steps/party/pos-party-members-step.component').then(m => m.PosPartyMembersStepComponent),
  titleKey: 'boxOffice.partyMembers.handheld.selectPartyMembers',
  transitions: [],
};

const configs: PosPartyHandheldModalConfigs = {
  date: { initialStepId: POS_PARTY_HANDHELD_SHEET.Date, steps: { date: dateStep } },
  party: { initialStepId: POS_PARTY_HANDHELD_SHEET.Party, steps: { party: partyStep } },
};

export function posPartyHandheldModalConfig<TSheet extends PosPartyHandheldSheet>(sheet: TSheet): PosPartyHandheldModalConfigs[TSheet] {
  return configs[sheet];
}
