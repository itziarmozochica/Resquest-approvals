import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EditingPlanService } from '@fz-original/app/modules/content-plan/services/editing-plan/editing-plan.service';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { IgntToastService } from '@ignite/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { merge } from 'rxjs';

import { ImmersiveActionsBarComponent } from '../../components/immersive-actions-bar/immersive-actions-bar.component';
import { ImmersiveLayoutBarComponent } from '../../components/immersive-layout-bar/immersive-layout-bar.component';
import { ImmersiveModuleContentComponent } from '../../components/immersive-module-content/immersive-module-content.component';
import { ImmersiveModulePanelComponent } from '../../components/immersive-module-panel/immersive-module-panel.component';
import { ImmersiveStatePanelComponent } from '../../components/immersive-state-panel/immersive-state-panel.component';
import type { ImmersiveModuleType } from '../../models/immersive-layout-module-type.model';
import type { AutoTranslateAction } from '../../models/immersive-layout-translation.model';
import { IMMERSIVE_PLAN_CONTEXT } from '../../models/immersive-plan-context.model';
import { IMMERSIVE_SIBLING_TABS } from '../../models/immersive-sibling-tabs.model';
import { ImmersiveContentPlanService } from '../../services/immersive-content-plan.service';
import { ImmersiveMediaProbeService } from '../../services/immersive-media-probe.service';
import { ImmersiveContentPlanStore } from '../../store/immersive-content-plan.store';
import { immersiveContentPlanTrackingProvider } from '../../tracking/immersive-content-plan.tracking-provider';
import { formatImmersiveLocaleLabel } from '../../utils/immersive-layout-locale-label.util';
import { resolveModuleMoveIndexes } from '../../utils/immersive-layout-reorder.util';
import { ImmersivePlanContextService } from './immersive-plan-context.service';
import { ImmersiveSiblingTabsService } from './immersive-sibling-tabs.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ImmersiveActionsBarComponent,
    ImmersiveLayoutBarComponent,
    ImmersiveModuleContentComponent,
    ImmersiveModulePanelComponent,
    ImmersiveStatePanelComponent,
    TranslateModule,
  ],
  providers: [
    ImmersiveContentPlanService,
    ImmersiveContentPlanStore,
    ImmersiveMediaProbeService,
    { provide: IMMERSIVE_PLAN_CONTEXT, useClass: ImmersivePlanContextService },
    { provide: IMMERSIVE_SIBLING_TABS, useClass: ImmersiveSiblingTabsService },
    ...immersiveContentPlanTrackingProvider(),
  ],
  selector: 'app-immersive-content-plan-editor',
  standalone: true,
  styleUrl: './immersive-content-plan-editor.component.scss',
  templateUrl: './immersive-content-plan-editor.component.html',
})
export class ImmersiveContentPlanEditorComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #editingPlanService = inject(EditingPlanService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #store = inject(ImmersiveContentPlanStore);
  readonly #toastService = inject(IgntToastService);
  readonly #translateService = inject(TranslateService);

  #partnerId: number | null = null;
  #planId: number | null = null;

  // Signals, unlike the ids above, because the channels request follows them: the plan in view, and
  // the flag reading. Stored variants keep their channel labels with the flag off, so they need the request too.
  readonly #channelsPlan = signal<{ partnerId: number; planId: number } | null>(null);
  readonly #isFlagOn = signal(false);
  readonly #needsChannels = computed(() => this.#isFlagOn() || this.#store.hasChannelVariants());

  protected readonly failedReason = computed(() => this.#store.envelope()?.generation?.error ?? '');
  protected readonly fetchAction = this.#store.fetchAction;
  protected readonly generalSettingsDirty = this.#store.generalSettingsDirty;
  protected readonly isLoading = this.#store.isLoading;
  protected readonly moduleViews = this.#store.moduleViews;
  protected readonly scheduleAction = this.#store.scheduleAction;
  protected readonly screenState = this.#store.screenState;
  protected readonly selectedModuleId = this.#store.selectedModuleId;

  constructor() {
    this.#editingPlanService
      .getSelectedPlanOption$()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(option => {
        this.#planId = option?.id ?? null;
        this.#partnerId = this.#partnerService.getPartner()?.id ?? null;
        if (this.#partnerId !== null && this.#planId !== null) {
          this.#store.loadEnvelope({ partnerId: this.#partnerId, planId: this.#planId });
        } else {
          this.#store.loadEnvelope(null);
        }
        this.#channelsPlan.set(
          this.#partnerId !== null && this.#planId !== null ? { partnerId: this.#partnerId, planId: this.#planId } : null,
        );
        this.#syncChannelVariantsFlag();
        this.#syncVenueSvgFlag();
      });
    // The flag reads `null` until Optimizely has its data; a changed reading afterwards re-syncs once.
    merge(this.#optimizelyService.observeUserData(), this.#optimizelyService.observePlanData())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        if (this.#isChannelVariantsFlagOn(this.#partnerId, this.#planId) !== this.#isFlagOn()) {
          this.#syncChannelVariantsFlag();
        }
        this.#syncVenueSvgFlag();
      });
    effect(() => {
      const plan = this.#channelsPlan();
      const needsChannels = this.#needsChannels();
      untracked(() => this.#store.loadChannels(needsChannels ? plan : null));
    });
    // `rxMethod` accepts a signal directly: it re-runs on every change to the module fields the
    // document currently carries, so a freshly pasted media url gets probed without a manual call.
    this.#store.probeMediaUrls(this.#store.newMediaUrls);
    // Reported here rather than in the translations panel, which can be closed while a run is in flight.
    effect(() => {
      const action = this.#store.autoTranslateAction();
      if (action === null) {
        return;
      }
      untracked(() => {
        this.#reportAutoTranslate(action);
        this.#store.clearAutoTranslateAction();
      });
    });
  }

  areChangesUnsaved(): boolean {
    return this.#store.hasUnsavedChanges();
  }

  protected addModule(type: ImmersiveModuleType): void {
    this.#store.addModule(type);
  }

  protected generate(): void {
    if (this.#partnerId === null || this.#planId === null) {
      return;
    }
    this.#store.scheduleGeneration({ partnerId: this.#partnerId, planId: this.#planId });
  }

  // `move` carries positions in the panel's VISIBLE list (a product-hidden module type is filtered
  // out of `moduleViews`), so it must be translated back to real `layout.schema.modules` indexes
  // before the store — which moves by real index — ever sees it.
  protected moveModule(move: { from: number; to: number }): void {
    const resolved = resolveModuleMoveIndexes(this.moduleViews(), move.from, move.to);
    if (resolved === null) {
      return;
    }
    this.#store.moveModule(resolved.from, resolved.to);
  }

  protected retry(): void {
    if (this.#partnerId === null || this.#planId === null) {
      return;
    }
    this.#store.loadEnvelope({ partnerId: this.#partnerId, planId: this.#planId });
  }

  protected selectModule(moduleId: string): void {
    this.#store.selectModule(moduleId);
  }

  // The flag gates adding a variant only (`null`, the SDK not ready, reads as off).
  #isChannelVariantsFlagOn(partnerId: number | null, planId: number | null): boolean {
    return this.#isPlanFlagOn(FeatureFlags.IMMERSIVE_PLAN_LAYOUT_CHANNEL_VARIANTS, partnerId, planId);
  }

  #isPlanFlagOn(flag: FeatureFlags, partnerId: number | null, planId: number | null): boolean {
    return partnerId !== null && planId !== null && this.#optimizelyService.isFeatureEnabled(flag, { plan_id: String(planId) }) === true;
  }

  #isVenueSvgFlagOn(partnerId: number | null, planId: number | null): boolean {
    return this.#isPlanFlagOn(FeatureFlags.IMMERSIVE_PLAN_LAYOUT_VENUE_SVG, partnerId, planId);
  }

  #reportAutoTranslate({ failedLocales, kind }: AutoTranslateAction): void {
    if (kind === 'partial') {
      const locales = failedLocales.map(formatImmersiveLocaleLabel).join(', ');
      this.#toastService.warning(this.#translateService.instant('planEdition.immersiveContentPlan.autoTranslatePartial', { locales }));
    } else {
      this.#toastService.danger(this.#translateService.instant('planEdition.immersiveContentPlan.autoTranslateFailed'));
    }
  }

  #syncChannelVariantsFlag(): void {
    const isEnabled = this.#isChannelVariantsFlagOn(this.#partnerId, this.#planId);
    this.#isFlagOn.set(isEnabled);
    this.#store.setChannelVariantsEnabled(isEnabled);
  }

  #syncVenueSvgFlag(): void {
    this.#store.setVenueSvgEnabled(this.#isVenueSvgFlagOn(this.#partnerId, this.#planId));
  }
}
