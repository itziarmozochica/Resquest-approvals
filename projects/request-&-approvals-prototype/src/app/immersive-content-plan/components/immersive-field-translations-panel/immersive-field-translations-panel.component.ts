import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
  IGNT_DIALOG_DATA,
  IgntButtonComponent,
  IgntDialogCloseDirective,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
  IgntDialogService,
} from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { filter, take } from 'rxjs';

import type {
  ImmersiveAutoTranslateDialogData,
  ImmersiveAutoTranslateDialogResult,
} from '../../models/immersive-auto-translate-dialog.model';
import { ImmersiveContentPlanStore } from '../../store/immersive-content-plan.store';
import {
  autoTranslateFilledTargets,
  autoTranslatePlan,
  autoTranslateTargets,
  baseTextChanged,
} from '../../utils/immersive-layout-auto-translate.util';
import { translationOf } from '../../utils/immersive-layout-field.util';
import { isTokenTranslated } from '../../utils/immersive-layout-locale-gaps.util';
import { formatImmersiveLocaleLabel } from '../../utils/immersive-layout-locale-label.util';
import { orderedLocales } from '../../utils/immersive-layout-locale.util';
import { ImmersiveAutoTranslateDialogComponent } from '../immersive-auto-translate-dialog/immersive-auto-translate-dialog.component';
import { ImmersiveMarkdownEditorComponent } from '../immersive-markdown-editor/immersive-markdown-editor.component';
import type { ImmersiveFieldTranslationsPanelData, TranslationRowView } from './immersive-field-translations-panel.model';

/**
 * One token field in every locale of the plan. The panel is a view over the working document: each
 * keystroke lands in the store through `setTokenDraft`, so the module badge, the item count and the
 * language dropdown follow it live and "Done" has nothing left to save.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IgntButtonComponent,
    IgntDialogCloseDirective,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    IgntInputFieldComponent,
    IgntTagComponent,
    IgntTextareaFieldComponent,
    ImmersiveMarkdownEditorComponent,
    TranslateModule,
  ],
  selector: 'app-immersive-field-translations-panel',
  standalone: true,
  styleUrl: './immersive-field-translations-panel.component.scss',
  templateUrl: './immersive-field-translations-panel.component.html',
})
export class ImmersiveFieldTranslationsPanelComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #store = inject(ImmersiveContentPlanStore);

  protected readonly data = inject<ImmersiveFieldTranslationsPanelData>(IGNT_DIALOG_DATA);

  // `null` is the filter off. On, it holds the locales that were missing at the moment it was
  // switched on: the first keystroke makes a locale translated, and re-deriving the list live would
  // destroy the input under the user's fingers. The next toggle takes a fresh snapshot.
  readonly #pinnedMissing = signal<ReadonlySet<string> | null>(null);

  protected readonly onlyMissing = computed(() => this.#pinnedMissing() !== null);

  protected readonly rows = computed<TranslationRowView[]>(() => {
    const layout = this.#store.layout();
    if (layout === null) {
      return [];
    }
    const committed = this.#store.committedLayout();
    const baseLocale = this.#store.baseLocale();
    const { token } = this.data;
    return orderedLocales(layout.available_languages, baseLocale).map(code => {
      const text = translationOf(layout.translations, token, code) ?? '';
      const committedText = committed === null ? '' : (translationOf(committed.translations, token, code) ?? '');
      return {
        code,
        dirty: text !== committedText,
        inputId: `immersive-translation-${token}-${code}`,
        isBase: code === baseLocale,
        label: formatImmersiveLocaleLabel(code),
        missing: !isTokenTranslated(layout.translations, token, code),
        text,
      };
    });
  });

  // One pass over the non-base rows for both figures the header tag shows.
  readonly #counts = computed(() =>
    this.rows().reduce(
      (counts, row) => (row.isBase ? counts : { missing: counts.missing + (row.missing ? 1 : 0), total: counts.total + 1 }),
      { missing: 0, total: 0 },
    ),
  );

  protected readonly totalCount = computed(() => this.#counts().total);

  protected readonly missingCount = computed(() => this.#counts().missing);

  // The base row always stays: it is the text the other locales are translating.
  protected readonly visibleRows = computed(() => {
    const pinned = this.#pinnedMissing();
    return pinned === null ? this.rows() : this.rows().filter(row => row.isBase || pinned.has(row.code));
  });

  protected readonly isTranslating = computed(() => this.#store.autoTranslatingToken() === this.data.token);

  // Informational only: the button never depends on it.
  protected readonly baseChanged = computed(() => {
    const layout = this.#store.layout();
    const baseLocale = this.#store.baseLocale();
    return layout !== null && baseLocale !== null && baseTextChanged(layout, this.#store.committedLayout(), this.data.token, baseLocale);
  });

  // The dialog's `filledCount` and `totalCount`: every non-base locale "Translate" can write to.
  readonly #targetCounts = computed<{ filled: number; total: number }>(() => {
    const layout = this.#store.layout();
    const baseLocale = this.#store.baseLocale();
    if (layout === null || baseLocale === null) {
      return { filled: 0, total: 0 };
    }
    return {
      filled: autoTranslateFilledTargets(layout, this.data.token, baseLocale).length,
      total: autoTranslateTargets(layout, this.data.token, baseLocale, 'all').length,
    };
  });

  protected readonly isAutoTranslateDisabled = computed(() => {
    const activeToken = this.#store.autoTranslatingToken();
    if (activeToken !== null) {
      return activeToken !== this.data.token;
    }
    const layout = this.#store.layout();
    const baseLocale = this.#store.baseLocale();
    return !(
      this.#store.canEditLayout() &&
      layout !== null &&
      baseLocale !== null &&
      autoTranslatePlan(layout, this.data.token, baseLocale, 'all') !== null
    );
  });

  protected onTextChange(locale: string, value: string): void {
    this.#store.setTokenDraft(locale, this.data.token, value, this.data.isSwitchable);
  }

  protected toggleOnlyMissing(): void {
    this.#pinnedMissing.update(pinned =>
      pinned === null
        ? new Set(
            this.rows()
              .filter(row => !row.isBase && row.missing)
              .map(row => row.code),
          )
        : null,
    );
  }

  protected onAutoTranslate(): void {
    const { token } = this.data;
    const { filled, total } = this.#targetCounts();
    if (filled === 0) {
      this.#store.autoTranslateToken({ mode: 'missing', token });
      return;
    }
    this.#dialog
      .openModal<ImmersiveAutoTranslateDialogResult>(ImmersiveAutoTranslateDialogComponent, {
        data: { filledCount: filled, totalCount: total } satisfies ImmersiveAutoTranslateDialogData,
        injector: this.#injector,
        size: 'md',
      })
      .closed$.pipe(take(1), filter(Boolean), takeUntilDestroyed(this.#destroyRef))
      .subscribe(mode => {
        this.#store.autoTranslateToken({ mode, token });
      });
  }
}
