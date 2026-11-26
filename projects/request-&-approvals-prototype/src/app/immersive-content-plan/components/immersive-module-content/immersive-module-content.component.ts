import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import {
  IgntAccordionBodyDirective,
  IgntAccordionComponent,
  IgntAccordionItemComponent,
  IgntButtonComponent,
  IgntDialogService,
  IgntMenuComponent,
  IgntMenuItemComponent,
  IgntMenuTriggerForDirective,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import {
  IgntButtonDropdownComponent,
  type IgntButtonDropdownOption,
} from '@ignite/legacy/components/ignt-button-dropdown/ignt-button-dropdown.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter, take } from 'rxjs';

import { GENERAL_SETTINGS_ID } from '../../models/immersive-content-plan-editor.model';
import type { ModuleDescriptor } from '../../models/immersive-layout-descriptor.model';
import { getDescriptor, isSupportedModuleType } from '../../models/immersive-layout-descriptor.registry';
import type { ImmersiveLayoutModule } from '../../models/immersive-layout-document.model';
import type { MediaCheck } from '../../models/immersive-media-check.model';
import { getModulePreviewImage } from '../../models/immersive-module-preview.model';
import { CHANNEL_ADD_ICON, CHANNEL_GAPS_ICON, CHANNEL_I18N_PREFIX } from '../../models/immersive-plan-channel.model';
import { IMMERSIVE_SIBLING_TABS } from '../../models/immersive-sibling-tabs.model';
import { ImmersiveContentPlanStore } from '../../store/immersive-content-plan.store';
import { resolveChannelVariantControls } from '../../utils/immersive-layout-channel-variants.util';
import { resolveFieldEdit, type FieldInput } from '../../utils/immersive-layout-field-edit.util';
import {
  buildModuleContentView,
  buildModuleFieldShells,
  flattenGroupRows,
  resolveModuleFieldViews,
  type ArrayGroupView,
  type ModuleFieldShell,
  type ModuleFieldView,
} from '../../utils/immersive-layout-field-view.util';
import {
  collectModuleFields,
  isFieldHiddenByValue,
  isFieldHiddenForAudience,
  type CollectedField,
} from '../../utils/immersive-layout-field.util';
import { findEditableModule, toEditableModuleKey } from '../../utils/immersive-layout-general-settings.util';
import { formatImmersiveLocaleLabel } from '../../utils/immersive-layout-locale-label.util';
import { hasLocaleCopy } from '../../utils/immersive-layout-locale.util';
import { mediaCheckKeyOf, resolveMediaKindForField } from '../../utils/immersive-layout-media-urls.util';
import { canRemoveModule, findCommittedModule } from '../../utils/immersive-layout-modules.util';
import {
  resolveSiblingTabShortcut,
  type ImmersiveSiblingTabLink,
  type ImmersiveSiblingTabShortcut,
} from '../../utils/immersive-layout-sibling-tab-shortcut.util';
import { ImmersiveArrayGroupComponent } from '../immersive-array-group/immersive-array-group.component';
import { ImmersiveFieldTranslationsPanelComponent } from '../immersive-field-translations-panel/immersive-field-translations-panel.component';
import { ImmersiveFieldComponent } from '../immersive-field/immersive-field.component';
import { ImmersiveMediaPreviewDialogComponent } from '../immersive-media-preview-dialog/immersive-media-preview-dialog.component';
import { ImmersiveModulePreviewComponent } from '../immersive-module-preview/immersive-module-preview.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAccordionBodyDirective,
    IgntAccordionComponent,
    IgntAccordionItemComponent,
    IgntButtonComponent,
    IgntButtonDropdownComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntMenuComponent,
    IgntMenuItemComponent,
    IgntMenuTriggerForDirective,
    IgntTagComponent,
    IgntWrapperCardComponent,
    ImmersiveArrayGroupComponent,
    ImmersiveFieldComponent,
    ImmersiveModulePreviewComponent,
    TranslateModule,
  ],
  selector: 'app-immersive-module-content',
  standalone: true,
  styleUrl: './immersive-module-content.component.scss',
  templateUrl: './immersive-module-content.component.html',
})
export class ImmersiveModuleContentComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(IgntDialogService);
  // The panel is created inside the overlay, whose injector knows nothing of this route: handing
  // ours over is what lets it resolve the same route-scoped store the editor edits.
  readonly #injector = inject(Injector);
  readonly #siblingTabs = inject(IMMERSIVE_SIBLING_TABS, { optional: true });
  readonly #store = inject(ImmersiveContentPlanStore);
  readonly #translate = inject(TranslateService);

  protected readonly baseLocale = this.#store.baseLocale;
  protected readonly committedLayout = this.#store.committedLayout;
  protected readonly layout = this.#store.layout;
  protected readonly selectedChannel = this.#store.selectedChannel;
  protected readonly selectedLocale = this.#store.selectedLocaleOrBase;
  protected readonly selectedModuleId = this.#store.selectedModuleId;

  protected readonly selectedModule = computed<ImmersiveLayoutModule | null>(() => {
    const layout = this.layout();
    if (layout === null) {
      return null;
    }
    return findEditableModule(layout, toEditableModuleKey(this.selectedModuleId(), this.selectedChannel()));
  });

  protected readonly committedModule = computed<ImmersiveLayoutModule | null>(() => {
    const layout = this.committedLayout();
    const module = this.selectedModule();
    if (layout === null || module === null) {
      return null;
    }
    return findCommittedModule(layout, module);
  });

  protected readonly channelControls = computed(() =>
    resolveChannelVariantControls(this.layout(), this.selectedModuleId(), this.#store.channels(), {
      canEdit: this.#store.canEditLayout(),
      isEnabled: this.#store.isChannelVariantsEnabled(),
    }),
  );

  // The default, the variants (a warning icon marks the ones with gaps), then the channels left to add.
  protected readonly channelOptions = computed<IgntButtonDropdownOption<string | null>[]>(() => {
    const { addable, variants } = this.channelControls() ?? { addable: [], variants: [] };
    const names = this.#store.channelNames();
    const gaps = this.#store.gapReport().gapsByEditableKey;
    return [
      ...[null, ...variants].map(
        (channelId): IgntButtonDropdownOption<string | null> => ({
          label: channelId === null ? this.#translate.instant(`${CHANNEL_I18N_PREFIX}.default`) : (names[channelId] ?? channelId),
          selected: channelId === this.selectedChannel(),
          trailingIcon: (gaps[toEditableModuleKey(this.selectedModuleId(), channelId)] ?? 0) > 0 ? CHANNEL_GAPS_ICON : null,
          value: channelId,
        }),
      ),
      ...(addable.length === 0 ? [] : [{ divider: true, label: '', value: null }]),
      ...addable.map(({ id, name }) => ({
        label: this.#translate.instant(`${CHANNEL_I18N_PREFIX}.addFor`, { channel: name }),
        leadingIcon: CHANNEL_ADD_ICON,
        value: id,
      })),
    ];
  });

  protected readonly selectedChannelLabel = computed(() => this.channelOptions().find(option => option.selected)?.label ?? '');

  // A language with no copy would leave the editor reading empty text as its base. A translation in
  // flight rewrites the copy that choice rests on, and a save in flight would resolve it against a
  // committed base that is about to change.
  protected readonly baseLocaleOptions = computed<IgntButtonDropdownOption<string>[]>(() => {
    const layout = this.layout();
    if (layout === null) {
      return [];
    }
    const baseLocale = this.baseLocale();
    const isBusy = this.#store.autoTranslatingToken() !== null || this.#store.isPersisting();
    return layout.available_languages.map(locale => ({
      disabled: isBusy || !hasLocaleCopy(layout, locale),
      label: formatImmersiveLocaleLabel(locale),
      selected: locale === baseLocale,
      value: locale,
    }));
  });

  protected readonly baseLocaleLabel = computed(() => this.baseLocaleOptions().find(option => option.selected)?.label ?? '');

  protected readonly descriptor = computed<ModuleDescriptor | undefined>(() => {
    const module = this.selectedModule();
    return module === null ? undefined : getDescriptor(module.type);
  });

  protected readonly isGeneralSettings = computed(() => this.selectedModuleId() === GENERAL_SETTINGS_ID);

  protected readonly siblingTabShortcut = computed<ImmersiveSiblingTabShortcut | undefined>(() => {
    const module = this.selectedModule();
    return module === null ? undefined : resolveSiblingTabShortcut(module.type);
  });

  // `undefined` without a provided bridge, for a note that names no tab, and when the destination tab
  // is not available for this plan/user: in every case the note renders without the link.
  protected readonly siblingTabLink = computed<ImmersiveSiblingTabLink | undefined>(() => {
    const shortcut = this.siblingTabShortcut();
    const siblingTabs = this.#siblingTabs;
    if (shortcut?.linkLabelKey === undefined || shortcut.tab === undefined || siblingTabs === null) {
      return undefined;
    }
    return siblingTabs.availableTabs().includes(shortcut.tab) ? { labelKey: shortcut.linkLabelKey, tab: shortcut.tab } : undefined;
  });

  protected readonly canDeleteModule = computed(() => {
    const layout = this.layout();
    return layout !== null && this.selectedChannel() === null && canRemoveModule(layout, this.selectedModuleId());
  });

  protected readonly isUnsupportedModule = computed(() => {
    const module = this.selectedModule();
    return module !== null && !isSupportedModuleType(module.type);
  });

  readonly #previewExpandedFor = signal<string | null>(null);

  protected readonly previewExpanded = computed(() => this.#previewExpandedFor() === this.selectedModuleId());

  protected readonly previewImageUrl = computed<string | null>(() => {
    const module = this.selectedModule();
    if (module === null) {
      return null;
    }
    return getModulePreviewImage(module.type);
  });

  protected readonly panelTitle = computed<string>(() => {
    if (this.isGeneralSettings()) {
      return this.#translate.instant('planEdition.immersiveContentPlan.generalSettings');
    }
    return this.descriptor()?.label ?? this.selectedModule()?.type ?? '';
  });

  readonly #enabledFlags = computed<ReadonlySet<string>>(
    () => new Set(this.#store.isVenueSvgEnabled() ? [FeatureFlags.IMMERSIVE_PLAN_LAYOUT_VENUE_SVG] : []),
  );

  readonly #collectedFields = computed<CollectedField[]>(() => {
    const module = this.selectedModule();
    const descriptor = this.descriptor();
    if (module === null || descriptor === undefined) {
      return [];
    }
    const audience = this.#store.planAudience();
    const enabledFlags = this.#enabledFlags();
    return collectModuleFields(module, descriptor).filter(
      collected =>
        !isFieldHiddenForAudience(collected.field, audience, enabledFlags) && !isFieldHiddenByValue(collected.field, module.props),
    );
  });

  readonly #fieldShells = computed<ModuleFieldShell[]>(() => {
    const module = this.selectedModule();
    const committedModule = this.committedModule();
    const layout = this.layout();
    if (module === null || committedModule === null || layout === null) {
      return [];
    }
    return buildModuleFieldShells(module, this.#collectedFields(), {
      availableLanguages: layout.available_languages,
      baseLocale: this.baseLocale(),
      committedModule,
      fieldErrorPaths: this.#store.gapReport().fieldErrorPaths,
      locale: this.selectedLocale(),
      mediaChecks: this.#store.mediaChecks(),
      module,
      newMediaKeys: this.#newMediaUrlSet(),
      translations: layout.translations,
    });
  });

  // The row template only needs "is this (kind, url) pair new", never the ref itself: resolved
  // once here so every field of the panel reads the same set instead of re-deriving it per field.
  readonly #newMediaUrlSet = computed(() => new Set(this.#store.newMediaUrls().map(mediaCheckKeyOf)));

  readonly #fieldViews = computed<ModuleFieldView[]>(() => {
    const module = this.selectedModule();
    const committedModule = this.committedModule();
    const layout = this.layout();
    const committedLayout = this.committedLayout();
    if (module === null || committedModule === null || layout === null || committedLayout === null) {
      return [];
    }
    return resolveModuleFieldViews(module.id, this.#fieldShells(), {
      committedModule,
      committedTranslations: committedLayout.translations,
      locale: this.selectedLocale(),
      translations: layout.translations,
    });
  });

  protected readonly contentView = computed(() => {
    const module = this.selectedModule();
    const layout = this.layout();
    if (module === null || layout === null) {
      return buildModuleContentView([], [], {
        moduleId: '',
        translate: (key, params) => this.#translate.instant(key, params),
        translations: {},
      });
    }
    return buildModuleContentView(this.#fieldViews(), this.descriptor()?.arrays ?? [], {
      moduleId: module.id,
      translate: (key, params) => this.#translate.instant(key, params),
      translations: layout.translations,
    });
  });

  protected onAddItem(arrayGroup: ArrayGroupView): void {
    const module = this.selectedModule();
    if (module !== null) {
      this.#store.addItem(module.id, arrayGroup.groupPath);
    }
  }

  protected onBaseLocaleOption(locale: string): void {
    if (locale !== this.baseLocale()) {
      this.#store.setBaseLocale(locale);
    }
  }

  protected onChannelOption(channelId: string | null): void {
    if (channelId === null || this.channelControls()?.variants.includes(channelId) === true) {
      this.#store.selectChannel(channelId);
    } else {
      this.#store.addChannelVariant(channelId);
    }
  }

  // `openConfirmModal` disables its own close shortcuts (backdrop click, Escape), so `closed$` only
  // ever emits `true` (accept) or `false` (Cancel) — never a dismiss-without-choosing case — but
  // `filter(Boolean)` is kept anyway: it is what makes "only remove on confirm" true by construction
  // rather than by the modal's documented behaviour never changing under it.
  protected onDeleteModule(): void {
    const module = this.selectedModule();
    if (module === null) {
      return;
    }
    const moduleId = module.id;
    this.#dialog
      .openConfirmModal(
        this.#translate.instant('planEdition.immersiveContentPlan.deleteModuleDialogTitle'),
        this.#translate.instant('planEdition.immersiveContentPlan.deleteModuleDialogSubtitle', { module: this.panelTitle() }),
        { isDestructive: true },
      )
      .closed$.pipe(take(1), filter(Boolean), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#store.removeModule(moduleId);
      });
  }

  protected onFieldChange(view: ModuleFieldView, input: FieldInput): void {
    const module = this.selectedModule();
    const layout = this.layout();
    const locale = this.selectedLocale();
    if (module === null || layout === null || locale === null) {
      return;
    }
    const edit = resolveFieldEdit(view, input, {
      moduleId: module.id,
      translations: layout.translations,
    });
    if (edit === null) {
      return;
    }
    if (edit.target === 'prop') {
      this.#store.setPropDraft(module.id, view.collected.path, edit.value);
      return;
    }
    if (edit.mintedPropValue !== undefined) {
      this.#store.setPropDraft(module.id, view.collected.path, edit.mintedPropValue);
    }
    this.#store.setTokenDraft(locale, edit.token, edit.value, edit.omitWhenBlank);
  }

  protected onItemDropped(arrayGroup: ArrayGroupView, event: CdkDragDrop<unknown>): void {
    const module = this.selectedModule();
    if (module === null) {
      return;
    }
    // `event.previousIndex`/`currentIndex` are positions in the rendered (possibly compressed)
    // `rows`, not raw array indices — translate through the row the drop actually touched.
    const fromIndex = arrayGroup.rows[event.previousIndex].index;
    const toIndex = arrayGroup.rows[event.currentIndex].index;
    this.#store.moveItem(module.id, arrayGroup.groupPath, fromIndex, toIndex);
  }

  protected onOpenMediaPreview(view: ModuleFieldView): void {
    const { media } = view;
    const module = this.selectedModule();
    if (media === null || module === null) {
      return;
    }
    // The dialog IS the probe — it renders the real `<img>`/`<video>` for this url and reports its
    // own load outcome back through `onResolved` — so there is no separate store-side probe call
    // here: a stored url would otherwise load twice, once for the row's cache and once for the
    // dialog itself. `resolveMediaKindForField` reads the sibling `type` prop the same way the
    // automatic probe pipeline does, instead of always handing the dialog the 'any' guess.
    const mediaKind = resolveMediaKindForField(module, view.collected);
    this.#dialog.openModal(ImmersiveMediaPreviewDialogComponent, {
      data: {
        kind: mediaKind,
        onResolved: (check: MediaCheck) => this.#store.recordMediaCheck(mediaKind, media.url, check),
        url: media.url,
      },
      injector: this.#injector,
      size: 'md',
    });
  }

  protected onOpenSiblingTab(): void {
    const link = this.siblingTabLink();
    const siblingTabs = this.#siblingTabs;
    if (link === undefined || siblingTabs === null) {
      return;
    }
    siblingTabs.open(link.tab);
  }

  protected onOpenTranslations(view: ModuleFieldView): void {
    const module = this.selectedModule();
    if (module === null || view.token === null) {
      return;
    }
    // Flattened depth-first so a field on a NESTED row (e.g. a lineup subitem) is found too, not
    // just the top-level rows a flat `flatMap(group => group.rows)` would have stopped at.
    const row = this.contentView()
      .arrayGroups.flatMap(flattenGroupRows)
      .find(candidate => candidate.fields.includes(view));
    this.#dialog.openSidePanel(ImmersiveFieldTranslationsPanelComponent, {
      data: {
        fieldLabelKey: view.labelKey,
        isSwitchable: view.isSwitchable,
        itemTitle: row?.title ?? null,
        moduleId: module.id,
        moduleLabel: this.panelTitle(),
        multiline: view.multiline,
        richText: view.richText,
        token: view.token,
      },
      injector: this.#injector,
      size: 'md',
    });
  }

  protected onPreviewExpandedChange(expanded: boolean): void {
    this.#previewExpandedFor.set(expanded ? this.selectedModuleId() : null);
  }

  protected onRemoveItem(arrayGroup: ArrayGroupView, itemIndex: number): void {
    const module = this.selectedModule();
    if (module !== null) {
      this.#store.removeItem(module.id, arrayGroup.groupPath, itemIndex);
    }
  }

  protected onRemoveVariant(): void {
    const channelId = this.selectedChannel();
    if (channelId === null) {
      return;
    }
    const channel = this.selectedChannelLabel();
    this.#dialog
      .openConfirmModal(
        this.#translate.instant(`${CHANNEL_I18N_PREFIX}.removeConfirmTitle`, { channel }),
        this.#translate.instant(`${CHANNEL_I18N_PREFIX}.removeConfirmBody`, { channel }),
        { isDestructive: true },
      )
      .closed$.pipe(take(1), filter(Boolean), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#store.removeChannelVariant(channelId);
      });
  }
}
