import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

import { IgntRichTextEditorTranslationsDirective } from '../../directives/rich-text-editor-translations.directive';
import {
  IGNT_RICH_TEXT_EDITOR_TOOLBAR_ACTION_CONFIG,
  IGNT_RICH_TEXT_EDITOR_TOOLBAR_TOGGLE_ACTIONS,
} from '../../models/constants/rich-text-editor-toolbar-action-config.const';
import { IGNT_RICH_TEXT_EDITOR_TOOLBAR_GROUPS } from '../../models/constants/rich-text-editor-toolbar-groups.const';
import { IgntRichTextEditorFeature } from '../../models/enums/rich-text-editor-feature.enum';
import { IgntRichTextEditorToolbarButtonView } from '../../models/rich-text-editor-toolbar-button-view.model';
import { IgntRichTextEditorToolbarItem } from '../../models/rich-text-editor-toolbar-item.model';
import { isFeatureEnabled } from '../../utils/build-extensions.util';
import { resolveIgntRichTextEditorToolbarActionLabel } from '../../utils/resolve-toolbar-action-label.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [IgntRichTextEditorTranslationsDirective],
  imports: [IgntIconComponent],
  selector: 'ignt-rich-text-editor-toolbar',
  standalone: true,
  styleUrl: './rich-text-editor-toolbar.component.scss',
  templateUrl: './rich-text-editor-toolbar.component.html',
})
export class IgntRichTextEditorToolbarComponent {
  readonly features = input.required<ReadonlySet<IgntRichTextEditorFeature>>();
  readonly activeActions = input<ReadonlySet<IgntRichTextEditorFeature>>(new Set());
  /** DOM id of the emoji panel the emoji button discloses; wires `aria-controls`. */
  readonly emojiPanelId = input<string | null>(null);
  readonly unavailableActions = input<ReadonlySet<IgntRichTextEditorFeature>>(new Set());

  readonly action = output<IgntRichTextEditorFeature>();

  readonly #translations = inject(IgntRichTextEditorTranslationsDirective).translations;

  protected readonly Feature = IgntRichTextEditorFeature;
  protected readonly toolbarLabel = computed(() => this.#translations().toolbar.toolbarLabel);
  protected readonly visibleItems = computed((): IgntRichTextEditorToolbarItem[] => {
    const features = this.features();
    const items: IgntRichTextEditorToolbarItem[] = [];

    for (const group of IGNT_RICH_TEXT_EDITOR_TOOLBAR_GROUPS) {
      const visibleActions = group.filter((toolbarFeature: IgntRichTextEditorFeature) => isFeatureEnabled(features, toolbarFeature));

      if (visibleActions.length > 0) {
        if (items.length > 0) {
          items.push({ kind: 'separator' });
        }

        for (const toolbarAction of visibleActions) {
          items.push({ action: toolbarAction, kind: 'button' });
        }
      }
    }

    return items;
  });

  protected readonly buttonViews = computed((): Map<IgntRichTextEditorFeature, IgntRichTextEditorToolbarButtonView> => {
    const views = new Map<IgntRichTextEditorFeature, IgntRichTextEditorToolbarButtonView>();

    for (const item of this.visibleItems()) {
      if (item.kind === 'button') {
        views.set(item.action, this.#buildButtonView(item.action));
      }
    }

    return views;
  });

  protected onActionClick(action: IgntRichTextEditorFeature): void {
    this.action.emit(action);
  }

  protected onToolbarButtonMouseDown(event: MouseEvent): void {
    // Prevents TipTap editor blur on toolbar click so text selection is preserved
    // before the click handler runs.
    event.preventDefault();
  }

  #buildButtonView(action: IgntRichTextEditorFeature): IgntRichTextEditorToolbarButtonView {
    const config = IGNT_RICH_TEXT_EDITOR_TOOLBAR_ACTION_CONFIG[action];
    const isActive = this.#isActionActive(action);
    // The emoji button discloses a panel, so it reports `aria-expanded` rather than `aria-pressed`.
    const isDisclosureAction = action === IgntRichTextEditorFeature.Emoji;
    const isToggleAction = !isDisclosureAction && IGNT_RICH_TEXT_EDITOR_TOOLBAR_TOGGLE_ACTIONS.has(action);

    return {
      action,
      ariaControls: isDisclosureAction && isActive ? this.emojiPanelId() : null,
      ariaExpanded: isDisclosureAction ? String(isActive) : null,
      ariaLabel: resolveIgntRichTextEditorToolbarActionLabel(this.#translations(), config.labelKey),
      ariaPressed: isToggleAction ? String(isActive) : null,
      disabled: !this.#isActionAvailable(action),
      icon: config.icon,
      isActive,
    };
  }

  #isActionActive(toolbarAction: IgntRichTextEditorFeature): boolean {
    return this.activeActions().has(toolbarAction);
  }

  #isActionAvailable(toolbarAction: IgntRichTextEditorFeature): boolean {
    return !this.unavailableActions().has(toolbarAction);
  }
}
