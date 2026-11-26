import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { SessionTypeCatalogItem } from '@fz-original/app/shared/services/sessions/session-type-catalog.model';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CoverageRule } from '../../enums/coverage-rule.enum';
import { SignerRole } from '../../enums/signer-role.enum';
import { AgreementCard, CardScopeKind } from '../../models/agreement-card.model';
import { TicketTypesState } from '../../models/ticket-type-option.model';
import { buildTicketTypeOptions } from '../../utils/ticket-type-options.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntExpansionPanelComponent, IgntRadioComponent, IgntTagComponent, IgntToggleComponent, MultiSelectModule, TranslateModule],
  selector: 'app-agreement-requirement-card',
  standalone: true,
  styleUrl: './agreement-requirement-card.component.scss',
  templateUrl: './agreement-requirement-card.component.html',
})
export class AgreementRequirementCardComponent {
  // IgntRadio emits from both the click and the change of its input, so a pick arrives twice within
  // the same task. The latch drops the second one and always clears itself, so a value the parent
  // never applies stays selectable.
  #emittedScopeKind: CardScopeKind | null = null;
  #emittedSignerRole: SignerRole | null = null;

  readonly #translateService = inject(TranslateService);

  readonly card = input.required<AgreementCard>();
  readonly canEdit = input<boolean>(true);
  readonly initiallyExpanded = input<boolean>(false);
  readonly ticketTypes = input<SessionTypeCatalogItem[]>([]);
  readonly ticketTypesState = input<TicketTypesState>('ready');

  readonly activeChange = output<boolean>();
  readonly scopeKindChange = output<CardScopeKind>();
  readonly sessionTypeIdsChange = output<number[]>();
  readonly signerRoleChange = output<SignerRole>();

  protected readonly coverageRule = CoverageRule;
  protected readonly signerRole = SignerRole;

  protected readonly coverageSummaryKey = computed<string>(() =>
    this.card().coverageRule === CoverageRule.perOrder
      ? 'eventSettings.agreements.summaryPerOrder'
      : 'eventSettings.agreements.summaryPerParticipant',
  );

  protected readonly fieldsDisabled = computed<boolean>(() => !this.canEdit() || !this.card().active);

  protected readonly scopeLabelKey = computed<string>(() =>
    this.card().scopeKind === 'plan' ? 'eventSettings.agreements.entireEvent' : 'eventSettings.agreements.specificTicketTypes',
  );

  protected readonly ticketTypesDisabled = computed<boolean>(() => this.fieldsDisabled() || this.ticketTypesState() !== 'ready');

  protected readonly ticketTypesErrorMessage = computed<string | null>(() =>
    this.ticketTypesState() === 'error' ? this.#translateService.instant('eventSettings.agreements.ticketTypesLoadError') : null,
  );

  /**
   * Selectable catalog entries plus every selected id they do not carry, so a requirement saved
   * against a shop product or a deleted ticket type stays visible and removable. Nothing is synthesised
   * until the catalog is ready: with it loading or failed, every id would look unavailable.
   */
  protected readonly ticketTypeOptions = computed<SelectOption[]>(() => {
    const selectedIds = this.ticketTypesState() === 'ready' ? this.card().sessionTypeIds : [];
    return buildTicketTypeOptions(this.ticketTypes(), selectedIds).map((option): SelectOption => {
      if (option.kind === 'unknown') {
        return {
          id: option.id,
          title: this.#translateService.instant('eventSettings.agreements.unavailableTicketType', { id: option.id }),
        };
      }
      if (option.kind === 'legacy') {
        return {
          description: this.#translateService.instant('eventSettings.agreements.legacyTicketType'),
          id: option.id,
          title: option.label,
        };
      }
      return { id: option.id, title: option.label };
    });
  });

  readonly #selectedTicketTypeOptions = computed<SelectOption[]>(() =>
    this.ticketTypeOptions().filter(option => this.card().sessionTypeIds.includes(Number(option.id))),
  );

  // The multi-select mutates the array it is handed, so it must never receive the computed's cached one.
  protected get selectedTicketTypeSelection(): SelectOption[] {
    return [...this.#selectedTicketTypeOptions()];
  }

  protected onActiveToggle(event: Event): void {
    event.stopPropagation();
    if (!this.canEdit()) {
      return;
    }
    // Safe: the toggle's change event always originates from its checkbox input.
    this.activeChange.emit((event.target as HTMLInputElement).checked);
  }

  protected onScopeKindSelect(scopeKind: CardScopeKind): void {
    if (this.fieldsDisabled() || scopeKind === this.#emittedScopeKind || scopeKind === this.card().scopeKind) {
      return;
    }
    this.#emittedScopeKind = scopeKind;
    queueMicrotask(() => (this.#emittedScopeKind = null));
    this.scopeKindChange.emit(scopeKind);
  }

  protected onSignerRoleSelect(signerRole: SignerRole): void {
    if (this.fieldsDisabled() || signerRole === this.#emittedSignerRole || signerRole === this.card().signerRole) {
      return;
    }
    this.#emittedSignerRole = signerRole;
    queueMicrotask(() => (this.#emittedSignerRole = null));
    this.signerRoleChange.emit(signerRole);
  }

  protected onTicketTypesSelected(options: SelectOption[]): void {
    // With the catalog ready every selected id is a rendered option, so the picker carries the ones
    // the user did not touch; anything else is blocked upstream by the disabled state.
    if (this.ticketTypesDisabled()) {
      return;
    }
    this.sessionTypeIdsChange.emit(options.map(option => Number(option.id)));
  }
}
