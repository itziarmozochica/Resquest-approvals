import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
  IGNT_DIALOG_DATA,
  IgntAlertComponent,
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { filter, take, type Observable } from 'rxjs';

import { ImmersiveModuleReplicationResultsTableComponent } from '../../components/immersive-module-replication-results-table/immersive-module-replication-results-table.component';
import type {
  ImmersiveModuleReplicationDialogData,
  ReplicationStatusRow,
} from '../../models/store/immersive-module-replication-store.model';
import { ImmersiveModuleReplicationService } from '../../services/immersive-module-replication.service';
import { ImmersiveContentPlanStore } from '../../store/immersive-content-plan.store';
import { ImmersiveModuleReplicationStore } from '../../store/immersive-module-replication.store';
import { collectEditableModules } from '../../utils/immersive-layout-general-settings.util';
import { normalizeDocumentLocales } from '../../utils/immersive-layout-locale.util';
import { buildReplicationCandidates } from '../../utils/immersive-module-replication-eligibility.util';
import { REPLICATION_COPY_KEYS, ROW_STATUS_ICONS, STATUS_LABEL_KEYS, type FooterMode } from './immersive-module-replication-dialog.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntDialogCloseDirective,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    IgntIconComponent,
    IgntTagComponent,
    IgntTextareaFieldComponent,
    ImmersiveModuleReplicationResultsTableComponent,
    TranslateModule,
  ],
  providers: [ImmersiveModuleReplicationStore, ImmersiveModuleReplicationService],
  selector: 'app-immersive-module-replication-dialog',
  styleUrl: './immersive-module-replication-dialog.component.scss',
  templateUrl: './immersive-module-replication-dialog.component.html',
})
export class ImmersiveModuleReplicationDialogComponent {
  readonly #contentPlanStore = inject(ImmersiveContentPlanStore);
  readonly #data = inject<ImmersiveModuleReplicationDialogData>(IGNT_DIALOG_DATA);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  protected readonly store = inject(ImmersiveModuleReplicationStore);

  protected readonly rowIcons = ROW_STATUS_ICONS;
  protected readonly statusLabelKeys = STATUS_LABEL_KEYS;

  // The dialog never receives `revert-to-draft` (a revert offers no replication), so the record is
  // keyed by the two intents that can reach it.
  protected readonly copy = computed(() => REPLICATION_COPY_KEYS[this.#data.intent as 'publish' | 'save-draft']);

  protected readonly headerTitleKey = computed(() => (this.store.step() === 'form' ? this.copy().formTitleKey : this.copy().runTitleKey));

  protected readonly statusRows = computed<ReplicationStatusRow[]>(() => {
    const publishStatus = this.store.publishStatus();
    const applyStatus = this.store.applyStatus();
    const copy = this.copy();
    // Each row is typed on its own: the two literals differ in `params`, and the union of the
    // literals is what widened them past the interface.
    const publishRow: ReplicationStatusRow = {
      id: 'publish',
      labelKey: copy.writeRowLabelKey,
      params: { planId: this.store.source()?.planId ?? '' },
      status: publishStatus === 'idle' ? 'pending' : publishStatus,
      ...(publishStatus === 'error' ? { messageKey: copy.writeFailedBannerKey } : {}),
    };
    const applyRow: ReplicationStatusRow = {
      id: 'apply',
      labelKey: 'planEdition.immersiveContentPlan.replication.statusApplyPlans',
      params: { count: this.store.parsedPlanIds().ids.length },
      status: applyStatus,
      ...(applyStatus === 'error' ? { messageKey: copy.writtenButApplyFailedKey } : {}),
    };
    return [publishRow, applyRow];
  });

  // Results exist only once the apply has settled; while it runs the status list is the whole story.
  protected readonly footerMode = computed<FooterMode>(() => {
    if (this.store.publishStatus() === 'error') {
      return 'publishFailed';
    }
    const status = this.store.applyStatus();
    return status === 'done' || status === 'error' ? 'results' : 'running';
  });

  protected readonly isRunning = computed(() => this.store.step() === 'run' && this.footerMode() === 'running');

  constructor() {
    const committedLayout = this.#contentPlanStore.committedLayout();
    const workingLayout = this.#contentPlanStore.working();
    const partnerId = this.#contentPlanStore.partnerId();
    const planId = this.#contentPlanStore.planId();
    if (committedLayout === null || workingLayout === null || partnerId === null || planId === null) {
      return;
    }
    // Nothing is written yet, so the source is the working layout, normalized exactly as the write
    // normalizes it: what gets replicated is what the publish is about to store.
    const working = normalizeDocumentLocales(workingLayout);
    this.store.initialize({
      availableLanguages: working.available_languages,
      layoutModules: collectEditableModules(working),
      modules: buildReplicationCandidates(committedLayout, working, this.#contentPlanStore.channelNames()),
      partnerId,
      planId,
      translations: working.translations,
    });
  }

  protected publishAndApply(): void {
    if (!this.store.canStart()) {
      return;
    }
    this.store.setPublishStatus('inProgress');
    // `persistLayout` clears the previous action and marks the write pending synchronously, so the
    // first outcome observed below always belongs to this write.
    this.#contentPlanStore.persistLayout({ intent: this.#data.intent });
    this.#awaitPublish().subscribe(outcome => {
      this.store.setPublishStatus(outcome === 'success' ? 'done' : 'error');
      if (outcome === 'success') {
        this.store.start();
      }
    });
  }

  // The dialog waits for the write, not the replication store: the store stays free of the content
  // plan store, so its specs and the dialog's never need one to stand in for the other.
  // A write that ends with no action at all is a 401/403 the auth interceptor already announced,
  // or a refused write: either way the plan was not published, and waiting would spin forever.
  #awaitPublish(): Observable<'error' | 'success'> {
    const outcome = computed<'error' | 'pending' | 'success'>(() => {
      const action = this.#contentPlanStore.publishAction();
      if (action === 'publishSuccess' || action === 'saveSuccess') {
        return 'success';
      }
      return action !== null || !this.#contentPlanStore.isPersisting() ? 'error' : 'pending';
    });
    return toObservable(outcome, { injector: this.#injector }).pipe(
      filter((value): value is 'error' | 'success' => value !== 'pending'),
      take(1),
      takeUntilDestroyed(this.#destroyRef),
    );
  }
}
