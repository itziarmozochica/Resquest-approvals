import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import {
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
  IgntDialogService,
} from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter, take } from 'rxjs';

import { ImmersiveModuleReplicationDialogComponent } from '../../containers/immersive-module-replication-dialog/immersive-module-replication-dialog.component';
import type { ImmersiveModuleReplicationDialogData } from '../../models/store/immersive-module-replication-store.model';
import { ImmersiveContentPlanStore } from '../../store/immersive-content-plan.store';
import { formatDiffHeader } from '../../utils/immersive-layout-diff-label.util';
import type { LayoutPersistIntent, PersistGate } from '../../utils/immersive-layout-persist-gate.util';
import type { WorkingChange } from '../../utils/immersive-layout-working.util';
import {
  CONFIRM_LABEL_KEYS,
  DIALOG_COPY_KEYS,
  OFFER_CHECKBOX_KEYS,
  PERSIST_ERROR_MESSAGE_KEYS,
  PUBLISH_BLOCKED_REASON_KEYS,
  REVERT_BLOCKED_REASON_KEYS,
  summarizeBlockedErrors,
  type ConfirmDialogVariant,
} from './immersive-actions-bar.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntDialogCloseDirective,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    TranslateModule,
  ],
  selector: 'app-immersive-actions-bar',
  standalone: true,
  styleUrl: './immersive-actions-bar.component.scss',
  templateUrl: './immersive-actions-bar.component.html',
})
export class ImmersiveActionsBarComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #store = inject(ImmersiveContentPlanStore);
  readonly #toastService = inject(ToastService);
  readonly #translate = inject(TranslateService);

  readonly #replicationDialogOpen = signal(false);

  protected readonly replicateAfterSave = signal(false);

  protected readonly confirmTemplate = viewChild.required<TemplateRef<unknown>>('confirmDialog');

  protected readonly confirmIntent = signal<LayoutPersistIntent>('publish');

  protected readonly draftCount = this.#store.draftCount;
  protected readonly draftSaveability = this.#store.draftSaveability;
  protected readonly hasUnsavedChanges = this.#store.hasUnsavedChanges;
  protected readonly isDraftLayout = this.#store.isDraftLayout;
  protected readonly isPersisting = this.#store.isPersisting;
  protected readonly labelledChanges = this.#store.labelledChanges;
  protected readonly layout = this.#store.layout;
  protected readonly pendingIntent = this.#store.pendingIntent;
  protected readonly publishability = this.#store.publishability;
  protected readonly revertability = this.#store.revertability;

  protected readonly publishBlocked = computed(() => this.publishability().reason !== 'ready');

  protected readonly revertBlocked = computed(() => this.revertability().reason !== 'ready');

  protected readonly saveBlocked = computed(() => this.draftSaveability().reason !== 'ready');

  // A view-only user, or no document at all: there is nothing to offer, not even a disabled CTA.
  protected readonly showActions = computed(() => {
    const reason = this.publishability().reason;
    return reason !== 'forbidden' && reason !== 'no-layout';
  });

  // The confirm keeps dying live off the gate that owns the open dialog — and only that one. A
  // record literal would read all three signals to index one, dragging the gates the dialog does
  // not render (and the payload each of them builds) into its dependencies.
  protected readonly canConfirm = computed(() => this.#gateFor(this.confirmIntent()).reason === 'ready');

  // The flag gates alone (no `IMMERSIVE_PLAN_LAYOUT_REPLICATION` permission pairing exists yet), plus
  // edit permission and the intent: a revert changes no module, so it has nothing to replicate.
  protected readonly canOfferReplication = computed(() => {
    const planId = this.#store.planId();
    if (planId === null || this.confirmIntent() === 'revert-to-draft') {
      return false;
    }
    const flagEnabled = this.#optimizelyService.isFeatureEnabled(FeatureFlags.IMMERSIVE_PLAN_LAYOUT_REPLICATION, {
      plan_id: String(planId),
    });
    return flagEnabled === true && this.#store.canEditLayout();
  });

  // Checking the box turns the confirm into a hand-off: nothing is written until the replication
  // dialog's own CTA, so the button can no longer promise the write it would have made.
  readonly #willReplicate = computed(() => this.replicateAfterSave() && this.canOfferReplication());

  protected readonly confirmLabelKey = computed(() => (this.#willReplicate() ? 'common.next' : CONFIRM_LABEL_KEYS[this.confirmIntent()]));

  protected readonly offerCheckboxKey = computed(() => OFFER_CHECKBOX_KEYS[this.confirmIntent()]);

  protected readonly blockedFragments = computed(() => summarizeBlockedErrors(this.publishability().errors));

  protected readonly publishBlockedReasonKey = computed<string | null>(
    () => PUBLISH_BLOCKED_REASON_KEYS[this.publishability().reason] ?? null,
  );

  protected readonly revertBlockedReasonKey = computed<string | null>(() =>
    this.showActions() && !this.isDraftLayout() ? (REVERT_BLOCKED_REASON_KEYS[this.revertability().reason] ?? null) : null,
  );

  // A publish reached from a clean draft is a promotion: same write, different story to tell.
  protected readonly dialogVariant = computed<ConfirmDialogVariant>(() => {
    const intent = this.confirmIntent();
    return intent === 'publish' && this.isDraftLayout() && !this.hasUnsavedChanges() ? 'promotion' : intent;
  });

  protected readonly dialogCopy = computed(() => DIALOG_COPY_KEYS[this.dialogVariant()]);

  // A revert has no diffs by definition, so the list must not survive a previous dialog mode.
  protected readonly showDiffList = computed(() => this.confirmIntent() !== 'revert-to-draft' && this.labelledChanges().length > 0);

  // Headers stay i18n keys until the dialog needs them: this is the only place that pays for a
  // translation lookup per pending change.
  protected readonly dialogDiffs = computed(() =>
    this.labelledChanges().map(entry => ({
      ...entry,
      headerText: formatDiffHeader(entry.header, (key, params) => this.#translate.instant(key, params)),
      positions: reorderPositionsOf(entry.change),
    })),
  );

  constructor() {
    // A failed write leaves the layout reading exactly as it did before, so the only evidence the
    // user gets is this toast. The store records which write failed and stays UI-free; the bar that
    // offered the CTA is what speaks. 401 and 403 never arrive here — the store drops those,
    // because `AuthenticationInterceptor` has already shown its own modal or toast for them.
    // While the replication dialog is open it renders that failure in its own banner, so the toast
    // would say it twice; the flag is read untracked so closing the dialog re-runs nothing.
    effect(() => {
      const action = this.#store.publishAction();
      if (untracked(() => this.#replicationDialogOpen())) {
        return;
      }
      const messageKey = action === null ? undefined : PERSIST_ERROR_MESSAGE_KEYS[action];
      if (messageKey === undefined) {
        return;
      }
      this.#toastService.addError(this.#translate.instant(messageKey));
    });
  }

  protected discard(): void {
    this.#store.discardDrafts();
  }

  // One entry point for all three writes: the intent the button carries is the intent the gate is
  // read from, the dialog is titled by, and the store is finally called with.
  protected openConfirmDialog(intent: LayoutPersistIntent): void {
    if (this.#gateFor(intent).reason !== 'ready') {
      return;
    }
    this.#store.clearPublishErrors();
    this.confirmIntent.set(intent);
    this.replicateAfterSave.set(false);
    const ref = this.#dialog.openModal<boolean>(this.confirmTemplate(), { size: 'md' });
    ref.closed$.pipe(take(1), filter(Boolean), takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (this.#willReplicate()) {
        this.#openReplicationDialog(intent);
        return;
      }
      this.#store.persistLayout({ intent });
    });
  }

  protected toggleReplicateAfterSave(value: boolean): void {
    this.replicateAfterSave.set(value);
  }

  // A switch, not a record: only the gate being asked about is read, so the other two stay out of
  // the caller's dependencies.
  #gateFor(intent: LayoutPersistIntent): PersistGate {
    switch (intent) {
      case 'publish':
        return this.publishability();
      case 'revert-to-draft':
        return this.revertability();
      case 'save-draft':
        return this.draftSaveability();
    }
  }

  // The dialog performs the write, so it is the one that needs the intent. Escape and a backdrop
  // click stay off: closing it while the publish is in flight would leave a published plan with
  // nothing applied and no one watching.
  #openReplicationDialog(intent: LayoutPersistIntent): void {
    const data: ImmersiveModuleReplicationDialogData = { intent };
    this.#replicationDialogOpen.set(true);
    const ref = this.#dialog.openModal(ImmersiveModuleReplicationDialogComponent, {
      data,
      disableCloseShortcuts: true,
      injector: this.#injector,
      size: 'lg',
    });
    ref.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#replicationDialogOpen.set(false));
  }
}

// 1-based positions, and only for a reorder that names both ends: a positionless move (adjacent
// swap, or several moves before saving) carries no attributable from/to at all.
function reorderPositionsOf(change: WorkingChange): { new: number; old: number } | null {
  if (change.kind !== 'reorder' || typeof change.oldValue !== 'number' || typeof change.newValue !== 'number') {
    return null;
  }
  return { new: change.newValue + 1, old: change.oldValue + 1 };
}
