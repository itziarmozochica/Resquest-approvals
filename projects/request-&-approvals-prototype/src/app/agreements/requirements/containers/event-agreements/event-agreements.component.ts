import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { ActionsBarComponent } from '@fz-original/app/shared/components/actions-bar/actions-bar.component';
import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, of, tap } from 'rxjs';

import { AgreementStatus } from '../../../enums/agreement-status.enum';
import { AGREEMENT_TYPE_META } from '../../../enums/agreement-type.enum';
import { Agreement } from '../../../models/agreement.model';
import { AgreementsService } from '../../../services/agreements.service';
import { currentVersion, formatAgreementDate } from '../../../utils/agreement-format.util';
import { AgreementRequirementCardComponent } from '../../components/agreement-requirement-card/agreement-requirement-card.component';
import { CoverageRule } from '../../enums/coverage-rule.enum';
import { SignerRole } from '../../enums/signer-role.enum';
import { AgreementCard, CardScopeKind } from '../../models/agreement-card.model';
import { AgreementRequirement } from '../../models/agreement-requirement.model';
import { RequirementDraft } from '../../models/requirement-draft.model';
import { TicketTypesState } from '../../models/ticket-type-option.model';
import { AgreementRequirementsStore } from '../../services/agreement-requirements.store';
import { areCardListsEqual, cloneCards } from '../../utils/agreement-cards.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActionsBarComponent, AgreementRequirementCardComponent, IgntSkeletonComponent, MultiSelectModule, TranslateModule],
  providers: [AgreementRequirementsStore],
  selector: 'app-event-agreements',
  standalone: true,
  styleUrl: './event-agreements.component.scss',
  templateUrl: './event-agreements.component.html',
})
export class EventAgreementsComponent {
  readonly planId = input.required<number>();
  readonly canEditPlan = input<boolean>(true);
  readonly onFormDirtyChange = input<((dirty: boolean) => void) | undefined>(undefined);
  readonly planBaseLocale = input<string | null>(null);

  readonly #agreementsService = inject(AgreementsService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  protected readonly store = inject(AgreementRequirementsStore);

  protected readonly agreements = signal<Agreement[]>([]);
  protected readonly agreementsLoading = signal<boolean>(true);
  protected readonly agreementsFailed = signal<boolean>(false);
  protected readonly cards = signal<AgreementCard[]>([]);
  protected readonly expandedAgreementId = signal<string | null>(null);

  readonly #savedCards = signal<AgreementCard[]>([]);
  #toastedTicketTypesError: unknown = null;
  readonly #saving = signal<boolean>(false);
  readonly #saveFailed = signal<boolean>(false);
  #deactivatedIds = new Set<number>();
  #expectedSignerRoles = new Map<number, SignerRole>();
  #dispatchedCards: AgreementCard[] = [];
  #pendingDrafts: RequirementDraft[] = [];

  readonly #activeAgreementOptions = computed<SelectOption[]>(() =>
    this.agreements().map(agreement => ({
      description: this.#agreementMeta(agreement),
      id: agreement.id,
      title: agreement.name,
    })),
  );

  protected readonly agreementOptions = computed<SelectOption[]>(() => {
    const active = this.#activeAgreementOptions();
    if (this.agreementsLoading() || this.agreementsFailed()) {
      return active;
    }
    const activeIds = new Set(active.map(option => option.id));
    const unavailable = this.cards()
      .filter(card => !activeIds.has(card.agreementId))
      .map(card => ({
        description: this.#translateService.instant('eventSettings.agreements.unavailableAgreement'),
        id: card.agreementId,
        title: card.name,
      }));
    return [...active, ...unavailable];
  });

  readonly #selectedAgreementOptions = computed<SelectOption[]>(() => {
    const optionsById = new Map(this.agreementOptions().map(option => [option.id, option]));
    return this.cards().map(card => optionsById.get(card.agreementId) ?? { id: card.agreementId, title: card.name });
  });

  protected get agreementSelection(): SelectOption[] {
    return [...this.#selectedAgreementOptions()];
  }

  protected readonly canEdit = computed<boolean>(() => this.canEditPlan() && this.store.canEdit());

  protected readonly isLoading = computed<boolean>(() => this.agreementsLoading() || this.store.listState() === 'loading');

  protected readonly hasChanges = computed<boolean>(() => this.#saveFailed() || !areCardListsEqual(this.cards(), this.#savedCards()));

  protected readonly isSaving = computed<boolean>(() => this.#saving());

  protected readonly ticketTypesState = computed<TicketTypesState>(() => {
    if (this.store.ticketTypesError() != null) {
      return 'error';
    }
    return this.store.isLoadingTicketTypes() ? 'loading' : 'ready';
  });

  constructor() {
    this.#destroyRef.onDestroy(() => this.onFormDirtyChange()?.(false));

    toObservable(this.planId)
      .pipe(
        tap(planId => {
          this.cards.set([]);
          this.#savedCards.set([]);
          this.expandedAgreementId.set(null);
          this.#pendingDrafts = [];
          this.#saveFailed.set(false);
          this.#saving.set(false);
          this.store.load({ planId });
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();

    this.#loadAgreements();

    effect(() => {
      if (this.store.listAction() === 'loadSuccess' && !this.agreementsLoading()) {
        this.#hydrateFromStore();
      }
      if (this.store.listAction() === 'loadError') {
        this.store.clearListAction();
        this.#toastService.addError(this.#translateService.instant('eventSettings.agreements.loadError'));
      }
      const ticketTypesError = this.store.ticketTypesError();
      if (ticketTypesError != null && ticketTypesError !== this.#toastedTicketTypesError) {
        this.#toastedTicketTypesError = ticketTypesError;
        this.#toastService.addError(this.#translateService.instant('eventSettings.agreements.ticketTypesLoadError'));
      }
    });

    effect(() => {
      if (!this.#saving()) {
        return;
      }
      if (this.store.isMutating() || this.store.togglingIds().length > 0) {
        return;
      }
      this.#finishSave();
    });

    effect(() => {
      this.onFormDirtyChange()?.(this.hasChanges());
    });
  }

  hasUnsavedChanges(): boolean {
    return this.hasChanges();
  }

  protected onCardActiveChange(agreementId: string, active: boolean): void {
    this.#updateCard(agreementId, card => ({ ...card, active }));
  }

  protected onCardScopeKindChange(agreementId: string, scopeKind: CardScopeKind): void {
    this.#updateCard(agreementId, card => ({ ...card, scopeKind }));
  }

  protected onCardSessionTypeIdsChange(agreementId: string, sessionTypeIds: number[]): void {
    this.#updateCard(agreementId, card => ({ ...card, sessionTypeIds }));
  }

  protected onCardSignerRoleChange(agreementId: string, signerRole: SignerRole): void {
    this.#updateCard(agreementId, card => ({ ...card, signerRole }));
  }

  protected onSave(): void {
    if (!this.canEdit() || this.#saving() || this.store.listState() !== 'loaded') {
      return;
    }
    if (!this.hasChanges()) {
      this.#toastService.add({
        autoHide: true,
        message: this.#translateService.instant('eventSettings.noChangesMessage'),
      });
      return;
    }

    const invalidCard = this.cards().find(card => card.active && card.scopeKind === 'ticketTypes' && card.sessionTypeIds.length === 0);
    if (invalidCard) {
      this.#toastService.addError(
        this.#translateService.instant('eventSettings.agreements.ticketTypesRequired', { name: invalidCard.name }),
      );
      return;
    }

    this.#saving.set(true);
    this.#deactivatedIds = new Set();
    this.#expectedSignerRoles = new Map();
    this.#pendingDrafts = [];
    this.#dispatchedCards = cloneCards(this.cards());
    this.store.clearMutationAction();
    this.store.clearBatchResult();
    this.#dispatchMutations();
    this.#dispatchNextDraft();
  }

  protected onAgreementsSelected(options: SelectOption[]): void {
    if (!this.canEdit() || this.store.listState() !== 'loaded') {
      return;
    }
    const selectedIds = new Set(options.map(option => String(option.id)));
    const currentIds = new Set(this.cards().map(card => card.agreementId));

    this.cards.update(cards => cards.filter(card => selectedIds.has(card.agreementId)));
    const expandedAgreementId = this.expandedAgreementId();
    if (expandedAgreementId != null && !selectedIds.has(expandedAgreementId)) {
      this.expandedAgreementId.set(null);
    }

    for (const option of options) {
      const agreementId = String(option.id);
      if (currentIds.has(agreementId)) {
        continue;
      }
      currentIds.add(agreementId);
      const card: AgreementCard = {
        active: true,
        agreementId,
        coverageRule: CoverageRule.perParticipant,
        name: option.title,
        scopeKind: 'plan',
        sessionTypeIds: [],
        signerRole: SignerRole.self,
      };
      this.cards.update(cards => [card, ...cards]);
      this.expandedAgreementId.set(agreementId);
    }
  }

  #agreementMeta(agreement: Agreement): string {
    const type = AGREEMENT_TYPE_META[agreement.agreementType]?.label ?? agreement.agreementType;
    const date = formatAgreementDate(agreement.updatedAt);
    const version = currentVersion(agreement);
    if (version) {
      return this.#translateService.instant('eventSettings.agreements.metaWithVersion', { date, type, version: version.version });
    }
    return this.#translateService.instant('eventSettings.agreements.meta', { date, type });
  }

  #dispatchMutations(): void {
    const rows = this.store.entities();
    const rowsByAgreement = new Map<string, AgreementRequirement[]>();
    for (const row of rows) {
      rowsByAgreement.set(row.agreementId, [...(rowsByAgreement.get(row.agreementId) ?? []), row]);
    }

    const selectedIds = new Set(this.cards().map(card => card.agreementId));

    for (const saved of this.#savedCards()) {
      if (selectedIds.has(saved.agreementId)) {
        continue;
      }
      for (const row of rowsByAgreement.get(saved.agreementId) ?? []) {
        if (row.active) {
          this.#deactivate(row.id);
        }
      }
    }

    for (const card of this.cards()) {
      const cardRows = rowsByAgreement.get(card.agreementId) ?? [];
      const desiredKeys = this.#desiredKeys(card);
      const existingKeys = new Set<number | null>();

      for (const row of cardRows) {
        const key = row.scope.kind === 'ticketType' ? row.scope.sessionTypeId : null;
        existingKeys.add(key);
        const inDesired = desiredKeys.includes(key);
        const wantedActive = inDesired && card.active;
        const needsActivation = row.active !== wantedActive;
        const needsSignerRole = wantedActive && row.signerRole !== card.signerRole;
        if (needsActivation && needsSignerRole) {
          this.#patchSignerRole(row.id, card.signerRole, true);
        } else if (needsActivation) {
          if (wantedActive) {
            this.store.setActive({ active: true, id: row.id });
          } else {
            this.#deactivate(row.id);
          }
        } else if (needsSignerRole) {
          this.#patchSignerRole(row.id, card.signerRole, false);
        }
      }

      const missing = card.active ? desiredKeys.filter(key => !existingKeys.has(key)) : [];
      if (missing.length > 0) {
        const missingTicketTypeIds = missing.filter((key): key is number => key !== null);
        this.#pendingDrafts = [
          ...this.#pendingDrafts,
          {
            agreementIds: [card.agreementId],
            coverageRule: card.coverageRule,
            scope:
              card.scopeKind === 'plan'
                ? { kind: 'plan' }
                : // Safe: missing.length > 0 and every ticketTypes key is a number, so the tuple is non-empty.
                  { kind: 'ticketTypes', sessionTypeIds: missingTicketTypeIds as [number, ...number[]] },
            signerRole: card.signerRole,
            translations: { [this.#draftLanguage()]: { title: card.name.slice(0, 350) } },
          },
        ];
      }
    }
  }

  #dispatchNextDraft(): boolean {
    const [draft, ...rest] = this.#pendingDrafts.filter(pending => this.#draftBelongsToSelection(pending));
    this.#pendingDrafts = rest;
    if (draft) {
      this.store.createBatch(draft);
      return true;
    }
    return false;
  }

  #draftBelongsToSelection(draft: RequirementDraft): boolean {
    const draftKeys: (number | null)[] = draft.scope.kind === 'plan' ? [null] : draft.scope.sessionTypeIds;
    return draft.agreementIds.every(agreementId => {
      const card = this.cards().find(candidate => candidate.agreementId === agreementId);
      if (card == null || !card.active) {
        return false;
      }
      const desiredKeys = this.#desiredKeys(card);
      return draftKeys.every(key => desiredKeys.includes(key));
    });
  }

  #draftLanguage(): string {
    return this.planBaseLocale() || this.#translateService.currentLang || this.#translateService.defaultLang || 'en';
  }

  #finishSave(): void {
    const batchResult = this.store.lastBatchResult();
    if (batchResult) {
      const pendingDeactivations = batchResult.ok.filter(row => row.active && !this.#rowBelongsToSelection(row));
      this.store.clearBatchResult();
      if (pendingDeactivations.length > 0) {
        for (const row of pendingDeactivations) {
          this.#deactivate(row.id);
        }
        return;
      }
    }

    if (this.#pendingDrafts.length > 0 && this.#dispatchNextDraft()) {
      return;
    }

    this.#saving.set(false);

    const stillSelected = new Set(this.cards().map(card => card.agreementId));
    const dispatchedIds = new Set(this.#dispatchedCards.map(card => card.agreementId));
    const persisted = this.#cardsFromStore();
    const failedUnassign = persisted.some(card => !dispatchedIds.has(card.agreementId));
    const failedDeactivation = this.store.entities().some(row => row.active && this.#deactivatedIds.has(row.id));
    const landed = persisted.filter(card => stillSelected.has(card.agreementId));
    const intended = this.#dispatchedCards.filter(card => card.active && stillSelected.has(card.agreementId));
    if (
      failedUnassign ||
      failedDeactivation ||
      this.#hasRowsOnTheWrongSignerRole() ||
      this.#hasRowsOutsideScope() ||
      !areCardListsEqual(landed, intended)
    ) {
      this.#savedCards.set(persisted);
      this.#saveFailed.set(true);
      this.#toastService.addError(this.#translateService.instant('eventSettings.errorMessage'));
      return;
    }

    this.#saveFailed.set(false);
    this.#savedCards.set(this.#dispatchedCards);
    this.#toastService.addSuccess(this.#translateService.instant('eventSettings.successMessage'));
  }

  #hasRowsOutsideScope(): boolean {
    const dispatchedById = new Map(this.#dispatchedCards.map(card => [card.agreementId, card]));
    return this.store.entities().some(row => {
      const card = dispatchedById.get(row.agreementId);
      if (!row.active || card == null) {
        return false;
      }
      const key = row.scope.kind === 'ticketType' ? row.scope.sessionTypeId : null;
      return !card.active || !this.#desiredKeys(card).includes(key);
    });
  }

  #deactivate(id: number): void {
    this.#deactivatedIds.add(id);
    this.store.setActive({ active: false, id });
  }

  #patchSignerRole(id: number, signerRole: SignerRole, activate: boolean): void {
    this.#expectedSignerRoles.set(id, signerRole);
    this.store.update({ id, patch: activate ? { active: true, signerRole } : { signerRole } });
  }

  #hasRowsOnTheWrongSignerRole(): boolean {
    return this.store.entities().some(row => {
      const expected = this.#expectedSignerRoles.get(row.id);
      return row.active && expected !== undefined && row.signerRole !== expected;
    });
  }

  #rowBelongsToSelection(row: AgreementRequirement): boolean {
    const card = this.cards().find(candidate => candidate.agreementId === row.agreementId);
    if (card == null || !card.active) {
      return false;
    }
    const key = row.scope.kind === 'ticketType' ? row.scope.sessionTypeId : null;
    return this.#desiredKeys(card).includes(key);
  }

  #desiredKeys(card: AgreementCard): (number | null)[] {
    return card.scopeKind === 'plan' ? [null] : card.sessionTypeIds;
  }

  #cardsFromStore(): AgreementCard[] {
    const rowsByAgreement = new Map<string, AgreementRequirement[]>();
    for (const row of this.store.entities()) {
      if (!row.active) {
        continue;
      }
      rowsByAgreement.set(row.agreementId, [...(rowsByAgreement.get(row.agreementId) ?? []), row]);
    }

    const agreementNames = new Map(this.agreements().map(agreement => [agreement.id, agreement.name]));
    const createdAt = (row: AgreementRequirement): number => Date.parse(row.createdAt) || 0;
    const cards = Array.from(rowsByAgreement, ([agreementId, rows]) => {
      const newest = rows.reduce((latest, row) => (createdAt(row) > createdAt(latest) ? row : latest));
      const hasPlanRow = rows.some(row => row.scope.kind === 'plan');
      const card: AgreementCard = {
        active: true,
        agreementId,
        coverageRule: newest.coverageRule,
        name: agreementNames.get(agreementId) ?? Object.values(newest.translations)[0]?.title ?? agreementId,
        scopeKind: hasPlanRow ? 'plan' : 'ticketTypes',
        sessionTypeIds: hasPlanRow
          ? []
          : rows.map(row => (row.scope.kind === 'ticketType' ? row.scope.sessionTypeId : null)).filter((id): id is number => id !== null),
        signerRole: newest.signerRole,
      };
      return { card, createdAt: Math.max(...rows.map(createdAt)) };
    });
    return [...cards].sort((a, b) => b.createdAt - a.createdAt).map(entry => entry.card);
  }

  #hydrateFromStore(): void {
    const cards = this.#cardsFromStore();
    this.cards.set(cards);
    this.#savedCards.set(cloneCards(cards));
    this.#saveFailed.set(false);
    this.expandedAgreementId.set(cards[0]?.agreementId ?? null);
    this.store.clearListAction();
  }

  #loadAgreements(): void {
    this.agreementsLoading.set(true);
    this.agreementsFailed.set(false);
    this.#agreementsService
      .list({ status: AgreementStatus.active })
      .pipe(
        tap(result => {
          this.agreements.set(result.items);
          this.agreementsLoading.set(false);
        }),
        catchError(() => {
          this.agreementsLoading.set(false);
          this.agreementsFailed.set(true);
          this.#toastService.addError(this.#translateService.instant('eventSettings.agreements.loadError'));
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #updateCard(agreementId: string, mutate: (card: AgreementCard) => AgreementCard): void {
    this.cards.update(cards => cards.map(card => (card.agreementId === agreementId ? mutate(card) : card)));
  }
}
