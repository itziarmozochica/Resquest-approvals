import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntButtonComponent, IgntTooltipDirective } from '@ignite/common';
import { IgntIconComponent, type IgntIconName } from '@ignite/icon';
import { IgntButtonDropdownComponent } from '@ignite/legacy/components/ignt-button-dropdown/ignt-button-dropdown.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule } from '@ngx-translate/core';

import type { FieldInput } from '../../utils/immersive-layout-field-edit.util';
import type { MediaFieldView, ModuleFieldView, TranslationGap } from '../../utils/immersive-layout-field-view.util';
import { ImmersiveMarkdownEditorComponent } from '../immersive-markdown-editor/immersive-markdown-editor.component';

/**
 * One editable field of the module panel, rendered from its resolved view. It owns no state and
 * decides nothing: which control to show comes from `view.kind`, and what an edit means is the
 * caller's business — this component only reports the raw value the control produced.
 */
const TRANSLATIONS_TRIGGER_KEYS = {
  done: 'planEdition.immersiveContentPlan.translationsTriggerDone',
  pending: 'planEdition.immersiveContentPlan.translationsTrigger',
} as const;

const MEDIA_PREVIEW_OPEN_KEY = 'planEdition.preview';

// `ignt-input-field` has no way to disable a single trail icon, only the whole field: a
// `checking`/`invalid`/`broken` icon rendered through it would be a focusable button with a name
// that does nothing. So the DS trail icon is reserved for the one status a click can act on — the
// eye, which previews a url the page can render, stored or just typed and proven to load. The
// other three statuses render their own non-focusable glyph instead, see `MEDIA_STATUS_ICON` and
// the `.immersive-field__media-status` span in the template. `idle` shows nothing either way. The
// media itself only ever renders inside the preview dialog, never in the form.
const MEDIA_TRAIL_ICON: Partial<Record<MediaFieldView['status'], [string, string]>> = {
  ok: ['fas', 'eye'],
  stored: ['fas', 'eye'],
};

// A spinner while the automatic probe is still deciding; a warning once it has settled on bad
// news. The error text (`immersive-field__media-error`, `aria-live="polite"`) is the accessible
// carrier of the message — this glyph is `aria-hidden`.
const MEDIA_STATUS_ICON: Partial<Record<MediaFieldView['status'], IgntIconName>> = {
  broken: 'exclamation-triangle',
  checking: 'spinner',
  invalid: 'exclamation-triangle',
};

const PREVIEWABLE_STATUSES: ReadonlySet<MediaFieldView['status']> = new Set(['ok', 'stored']);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IgntButtonComponent,
    IgntButtonDropdownComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntTextareaFieldComponent,
    IgntToggleComponent,
    IgntTooltipDirective,
    ImmersiveMarkdownEditorComponent,
    NgTemplateOutlet,
    TranslateModule,
  ],
  selector: 'app-immersive-field',
  standalone: true,
  styleUrl: './immersive-field.component.scss',
  templateUrl: './immersive-field.component.html',
})
export class ImmersiveFieldComponent {
  readonly view = input.required<ModuleFieldView>();
  readonly openMediaPreview = output<ModuleFieldView>();
  readonly openTranslations = output<ModuleFieldView>();
  readonly valueChange = output<FieldInput>();

  // `view()` is rebuilt on every edit of the module, so the switch keys off the memoized flag only:
  // a value turns it on, and a value that disappears turns it off unless the user erased it by typing
  // and the key still exists: a key gone altogether (a discard) always turns it off.
  #isErasedByTyping = false;
  // A token's `text` is the selected locale's copy, so a locale not translated yet would read as
  // empty: the stored `{{token}}` is what says the feature is on, whatever the locale.
  readonly #hasValue = computed(() => {
    const { kind, raw, text } = this.view();
    return kind === 'token' ? typeof raw === 'string' && raw !== '' : text !== '';
  });
  protected readonly isSwitchOn = linkedSignal<boolean, boolean>({
    computation: (hasValue, previous) =>
      hasValue || ((previous?.value ?? false) && this.#isErasedByTyping && this.view().raw !== undefined),
    source: this.#hasValue,
  });
  protected readonly labelId = computed(() => `${this.view().inputId}-label`);
  protected readonly switchId = computed(() => `${this.view().inputId}-switch`);

  // `ignt-toggle` exposes no output of its own: the native `change` bubbles from its inner checkbox.
  protected onToggleChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).checked);
  }

  // Switching on only reveals the input; switching off drops the key whenever it exists, an empty
  // string included, because the key's presence alone is what turns the feature on downstream.
  protected onSwitchToggleChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked; // the change bubbles from ignt-toggle's inner checkbox
    if (!checked && this.view().raw !== undefined) {
      this.valueChange.emit(null);
    }
    this.isSwitchOn.set(checked);
  }

  protected onTextChange(value: string): void {
    this.#isErasedByTyping = value === '';
    this.valueChange.emit(value);
  }

  protected translationsBadge(gap: TranslationGap): string {
    return gap.missing > 0 ? `${gap.missing}` : '';
  }

  protected translationsLabel(gap: TranslationGap): string {
    return gap.missing === 0 ? TRANSLATIONS_TRIGGER_KEYS.done : TRANSLATIONS_TRIGGER_KEYS.pending;
  }

  protected mediaTrailIcon(media: MediaFieldView | null): [string, string] | null {
    return media === null ? null : (MEDIA_TRAIL_ICON[media.status] ?? null);
  }

  protected mediaStatusIcon(media: MediaFieldView | null): IgntIconName | null {
    return media === null ? null : (MEDIA_STATUS_ICON[media.status] ?? null);
  }

  // The eye is the only trail icon left, so its aria-label only ever needs to name the action a
  // click performs. Every other status now renders through `mediaStatusIcon()` instead, which is
  // `aria-hidden` — the error text is what announces it.
  protected mediaTrailIconAriaLabel(view: ModuleFieldView): string {
    const { media } = view;
    return media !== null && PREVIEWABLE_STATUSES.has(media.status) ? MEDIA_PREVIEW_OPEN_KEY : '';
  }

  // The eye is the only trail icon that does anything: a `checking`/`invalid`/`broken` icon is
  // status-only, so a stray click (or an Enter on a focused-but-disabled-looking icon) must not
  // open a dialog for a url the page cannot render.
  protected onMediaTrailIconClicked(view: ModuleFieldView): void {
    const status = view.media?.status;
    if (status !== undefined && PREVIEWABLE_STATUSES.has(status)) {
      this.openMediaPreview.emit(view);
    }
  }
}
