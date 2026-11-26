import { ChangeDetectionStrategy, Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';

import {
  fitPartySessionAllocation,
  nextAllowedSessionAddition,
  type PartyMemberSessionOptions,
  type PartySessionAllocationFit,
  type Session,
} from '@fz/ticketing';
import {
  IGNT_DIALOG_DATA,
  IGNT_DIALOG_REF,
  IgntAlertComponent,
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogModule,
  IgntMediaQueriesService,
  IgntOptionTileComponent,
  IgntSwitchComponent,
  type IgntDialogRef,
} from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

import {
  additionsBySessionIdOf,
  additionsTotal,
  allocationAlert,
  buildSessionCounterVm,
  buildSessionTileVm,
  confirmText,
  doesNotFitAlert,
  fixedAdditionsSummary,
  initialSessionSelection,
  memberName,
  membersInPanelOrder,
  sessionPickerKey,
  sumAdditions,
  topSessionId,
  toSessionQuantities,
  visibleSessionTiles,
  withSessionQuantity,
} from '../../../utils/pos-party-session-picker-vm.util';
import {
  PartyAllocationMode,
  type AlertVm,
  type MemberSectionVm,
  type MemberSessionAllocation,
  type PosPartySessionPickerModalData,
  type PosPartySessionPickerModalResult,
  type SessionCounterVm,
  type SessionTileVm,
  type TranslatableText,
} from './pos-party-session-picker-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'pos-party-session-picker-modal' },
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntDialogCloseDirective,
    IgntDialogModule,
    IgntIconButtonComponent,
    IgntOptionTileComponent,
    IgntSwitchComponent,
    TranslateModule,
  ],
  selector: 'pos-party-session-picker-modal',
  styleUrl: './pos-party-session-picker-modal.component.scss',
  templateUrl: './pos-party-session-picker-modal.component.html',
})
export class PosPartySessionPickerModalComponent {
  static readonly mobileRowLength = 2;
  static readonly rowLength = 3;

  readonly #data = inject<PosPartySessionPickerModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<PosPartySessionPickerModalResult>>(IGNT_DIALOG_REF);
  readonly #media = inject(IgntMediaQueriesService);

  readonly #membersInOrder = membersInPanelOrder(this.#data.choice.memberSessionOptions, this.#data.members);
  readonly #membersWithChoice = this.#membersInOrder.filter((member: PartyMemberSessionOptions) => member.sessions.length > 1);
  readonly #membersWithoutChoice = this.#membersInOrder.filter((member: PartyMemberSessionOptions) => member.sessions.length === 1);
  readonly #isEveryMemberServed = this.#membersInOrder.every((member: PartyMemberSessionOptions) => member.sessions.length > 0);
  readonly #initialSelection = initialSessionSelection(this.#membersWithChoice, this.#data.reopen?.selection ?? null);

  readonly #allocation = signal<ReadonlyMap<string, MemberSessionAllocation>>(this.#initialSelection.allocation);
  readonly #modes = signal<ReadonlyMap<string, PartyAllocationMode>>(this.#initialSelection.modes);
  readonly #expandedMembers = signal<ReadonlySet<string>>(new Set());

  protected readonly subtitle = this.#data.subtitle;
  protected readonly fixedAdditionsSummary = fixedAdditionsSummary(this.#membersWithoutChoice, this.#data.members);

  readonly #rowLength = computed<number>(() =>
    this.#media.isMobile() ? PosPartySessionPickerModalComponent.mobileRowLength : PosPartySessionPickerModalComponent.rowLength,
  );

  readonly #additionsBySessionId = computed<ReadonlyMap<number, number>>(() =>
    additionsBySessionIdOf(this.#membersWithoutChoice, this.#allocation()),
  );

  readonly #allocationFit = computed<PartySessionAllocationFit>(() =>
    fitPartySessionAllocation(this.#data.choice.timeslot, toSessionQuantities(this.#additionsBySessionId()), this.#data.fitParams),
  );

  protected readonly sections = computed<readonly MemberSectionVm[]>(() =>
    this.#membersWithChoice.map((member: PartyMemberSessionOptions) => this.#buildSection(member)),
  );

  protected readonly incompleteSection = computed<TranslatableText | null>(() => {
    const incomplete = this.sections().find((section: MemberSectionVm) => !section.isComplete);

    return incomplete === undefined
      ? null
      : { key: sessionPickerKey('chooseMore'), params: { count: incomplete.quantity - incomplete.assigned, member: incomplete.name } };
  });

  readonly #reopenAlert = computed<AlertVm | null>(() =>
    this.#allocation() === this.#initialSelection.allocation ? (this.#data.reopen?.alert ?? null) : null,
  );

  protected readonly alert = computed<AlertVm | null>(() => {
    const reopenAlert = this.#reopenAlert();

    if (reopenAlert !== null) {
      return reopenAlert;
    }

    if (!this.#isEveryMemberServed) {
      return doesNotFitAlert();
    }

    return this.incompleteSection() === null ? allocationAlert(this.#allocationFit()) : null;
  });

  protected readonly ticketCount = computed<number>(() => sumAdditions(this.#additionsBySessionId()));

  protected readonly confirmLabel = computed<TranslatableText>(() =>
    confirmText(this.ticketCount(), additionsTotal(this.#additionsBySessionId(), this.#data.choice.timeslot.sessions), this.#data.locale),
  );

  protected readonly canConfirm = computed<boolean>(
    () =>
      this.#isEveryMemberServed && this.#reopenAlert() === null && this.incompleteSection() === null && this.#allocationFit().isSelectable,
  );

  protected confirm(): void {
    if (this.canConfirm()) {
      this.#dialogRef.close({
        nextQuantitiesBySessionId: this.#allocationFit().nextQuantitiesBySessionId,
        selection: { allocation: this.#allocation(), modes: this.#modes() },
      });
    }
  }

  protected expandSessions(memberKey: string): void {
    this.#expandedMembers.update((members: ReadonlySet<string>) => new Set([...members, memberKey]));
  }

  protected selectSession(memberKey: string, sessionId: number): void {
    const member = this.#memberWithChoice(memberKey);

    if (member !== undefined) {
      this.#setMemberAllocation(memberKey, new Map([[sessionId, member.quantity]]));
    }
  }

  protected setAllocationMode(memberKey: string, isSplit: boolean): void {
    const member = this.#memberWithChoice(memberKey);

    if (member === undefined) {
      return;
    }

    if (!isSplit) {
      const sessionId =
        topSessionId(this.#allocation().get(memberKey) ?? new Map<number, number>(), member.sessions) ?? member.sessions[0].id;

      this.#setMemberAllocation(memberKey, new Map([[sessionId, member.quantity]]));
    }

    this.#modes.update(
      (modes: ReadonlyMap<string, PartyAllocationMode>) =>
        new Map([...modes, [memberKey, isSplit ? PartyAllocationMode.Split : PartyAllocationMode.Single]]),
    );
  }

  protected stepSessionQuantity(memberKey: string, counter: SessionCounterVm, direction: 1 | -1): void {
    const session = this.#sessionById(counter.sessionId);
    const sessionTotal = this.#additionsBySessionId().get(counter.sessionId) ?? 0;
    const next =
      session === undefined
        ? null
        : nextAllowedSessionAddition(
            { current: sessionTotal, direction, session, timeslot: this.#data.choice.timeslot },
            this.#data.fitParams,
          );

    if (next === null) {
      return;
    }

    const allocation = this.#allocation().get(memberKey) ?? new Map<number, number>();

    this.#setMemberAllocation(memberKey, withSessionQuantity(allocation, counter.sessionId, counter.quantity + next - sessionTotal));
  }

  #buildSection(member: PartyMemberSessionOptions): MemberSectionVm {
    const allocation = this.#allocation().get(member.memberKey) ?? new Map<number, number>();
    const assigned = sumAdditions(allocation);
    const mode = this.#modes().get(member.memberKey) ?? PartyAllocationMode.Single;
    const isSplit = mode === PartyAllocationMode.Split;
    const isExpanded = this.#expandedMembers().has(member.memberKey);
    const tiles = visibleSessionTiles(
      member.sessions.map((session: Session) => buildSessionTileVm(session, allocation, this.#data.locale)),
      this.#rowLength(),
      isExpanded,
    );
    const visibleSessionIds = new Set(tiles.map((tile: SessionTileVm) => tile.sessionId));

    return {
      assigned,
      canSplit: member.quantity > 1,
      counters: isSplit
        ? member.sessions
            .filter((session: Session) => visibleSessionIds.has(session.id))
            .map((session: Session) =>
              buildSessionCounterVm({
                allocation,
                assigned,
                fitParams: this.#data.fitParams,
                locale: this.#data.locale,
                memberQuantity: member.quantity,
                session,
                sessionTotal: this.#additionsBySessionId().get(session.id) ?? 0,
                timeslot: this.#data.choice.timeslot,
              }),
            )
        : [],
      hiddenCount: member.sessions.length - tiles.length,
      isComplete: assigned === member.quantity,
      isSplit,
      memberKey: member.memberKey,
      name: memberName(member.memberKey, this.#data.members),
      quantity: member.quantity,
      tiles: isSplit ? [] : tiles,
    };
  }

  #memberWithChoice(memberKey: string): PartyMemberSessionOptions | undefined {
    return this.#membersWithChoice.find((member: PartyMemberSessionOptions) => member.memberKey === memberKey);
  }

  #sessionById(sessionId: number): Session | undefined {
    return this.#data.choice.timeslot.sessions.find((session: Session) => session.id === sessionId);
  }

  #setMemberAllocation(memberKey: string, allocation: MemberSessionAllocation): void {
    this.#allocation.update(
      (allocations: ReadonlyMap<string, MemberSessionAllocation>) => new Map([...allocations, [memberKey, allocation]]),
    );
  }
}
