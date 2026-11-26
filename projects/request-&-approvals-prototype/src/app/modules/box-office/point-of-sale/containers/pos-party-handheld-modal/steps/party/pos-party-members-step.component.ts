import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import {
  FztDateSelectorTranslationsDirective,
  FztPartyMemberCounterComponent,
  partyMembersInPanelOrder,
  type FztPartyMemberCounterVm,
  type FztPartyMemberQuantityChange,
  type ResolvedFztDateSelectorTranslations,
} from '@fz/ticketing-ui';
import { IgntButtonComponent } from '@ignite/common';

import { PosTicketSelectorStore } from '../../../../store/pos-ticket-selector.store';
import { PosPartyHandheldModalStore } from '../../store/pos-party-handheld-modal.store';
import { buildPartyDraftCountersVm } from '../../utils/pos-party-handheld-draft.util';

/** The party sheet's body: the till's counters over the draft; nothing reaches the POS store until Apply. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [FztDateSelectorTranslationsDirective],
  imports: [FztPartyMemberCounterComponent, IgntButtonComponent],
  selector: 'pos-party-members-step',
  styleUrl: './pos-party-members-step.component.scss',
  templateUrl: './pos-party-members-step.component.html',
})
export class PosPartyMembersStepComponent {
  readonly #modalStore = inject(PosPartyHandheldModalStore);
  readonly #party = inject(PosTicketSelectorStore);
  protected readonly translations: Signal<ResolvedFztDateSelectorTranslations> = inject(FztDateSelectorTranslationsDirective).translations;

  protected readonly members: Signal<readonly FztPartyMemberCounterVm[]> = computed(() =>
    buildPartyDraftCountersVm(partyMembersInPanelOrder(this.#party.partyMembers()), this.#modalStore.draftQuantities()),
  );

  protected readonly hasDraftSelection = computed<boolean>(() =>
    this.members().some((member: FztPartyMemberCounterVm) => member.quantity > 0),
  );

  protected onClear(): void {
    this.#modalStore.clearDraft();
  }

  protected onQuantityChanged(change: FztPartyMemberQuantityChange): void {
    this.#modalStore.setDraftQuantity(change.memberKey, change.quantity);
  }
}
