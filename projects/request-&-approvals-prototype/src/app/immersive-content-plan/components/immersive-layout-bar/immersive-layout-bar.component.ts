import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  IgntButtonDropdownComponent,
  type IgntButtonDropdownOption,
} from '@ignite/legacy/components/ignt-button-dropdown/ignt-button-dropdown.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import type { ImmersiveLocaleEntry } from '../../models/immersive-content-plan-screen-state.model';
import { ImmersiveContentPlanStore } from '../../store/immersive-content-plan.store';
import { countMissingTranslationKeys, extractDocumentTokens } from '../../utils/immersive-layout-locale-gaps.util';
import { formatImmersiveLocaleLabel } from '../../utils/immersive-layout-locale-label.util';

const MISSING_TRANSLATIONS_ICON: IconProp = ['fas', 'exclamation-triangle'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonDropdownComponent, IgntTagComponent, IgntWrapperCardComponent, TranslateModule],
  selector: 'app-immersive-layout-bar',
  standalone: true,
  styleUrl: './immersive-layout-bar.component.scss',
  templateUrl: './immersive-layout-bar.component.html',
})
export class ImmersiveLayoutBarComponent {
  readonly #store = inject(ImmersiveContentPlanStore);

  protected readonly baseLocale = this.#store.baseLocale;
  protected readonly layout = this.#store.layout;
  protected readonly selectedLocale = this.#store.selectedLocaleOrBase;

  // The document's token list is locale-independent: extract it once per layout change and let
  // every per-locale count check the same list instead of re-walking the whole document.
  readonly #documentTokens = computed(() => {
    const layout = this.layout();
    return layout === null ? [] : extractDocumentTokens(layout, this.#store.planAudience());
  });

  // One pass over the available languages: every consumer below is a lookup on this list.
  readonly #localeEntries = computed<ImmersiveLocaleEntry[]>(() => {
    const layout = this.layout();
    if (layout === null) {
      return [];
    }
    const tokens = this.#documentTokens();
    return layout.available_languages.map(locale => ({
      label: this.#localeLabel(locale),
      missing: countMissingTranslationKeys(tokens, layout.translations, locale),
      value: locale,
    }));
  });

  readonly #selectedEntry = computed(() => this.#localeEntries().find(entry => entry.value === this.selectedLocale()) ?? null);

  // A dropdown option only takes a label and a FontAwesome icon, so the gap is signalled with the
  // warning glyph alone; the exact count belongs to the trigger tag once that locale is selected.
  protected readonly localeOptions = computed<IgntButtonDropdownOption<string>[]>(() => {
    const selected = this.selectedLocale();
    return this.#localeEntries().map(({ label, missing, value }) => ({
      label,
      selected: value === selected,
      value,
      ...(missing > 0 ? { trailingIcon: MISSING_TRANSLATIONS_ICON } : {}),
    }));
  });

  protected readonly selectedLocaleLabel = computed(() => this.#selectedEntry()?.label ?? '');

  protected readonly selectedLocaleMissingCount = computed(() => this.#selectedEntry()?.missing ?? 0);

  protected readonly isBaseLocale = computed(() => {
    const base = this.baseLocale();
    return base !== null && this.selectedLocale() === base;
  });

  protected onLocaleSelected(locale: string): void {
    this.#store.selectLocale(locale);
  }

  #localeLabel(locale: string): string {
    return formatImmersiveLocaleLabel(locale);
  }
}
