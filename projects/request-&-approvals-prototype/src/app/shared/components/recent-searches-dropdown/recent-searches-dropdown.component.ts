import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injector, input, output } from '@angular/core';

import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { recentSearchTimeLabel } from './recent-search-time.util';
import { RecentSearch, RecentSearchItem } from './recent-search.model';

let nextId = 0;

/**
 * Suggestion list under a search field, as an APG listbox: the arrow keys walk the options, Enter picks one and
 * Delete forgets it. The ✕ on each row is the pointer shortcut for Delete, so the options hold no nested control.
 * The host keeps the filtering and the open state.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown)': 'handleKeydown($event)',
    '(mousedown)': '$event.preventDefault()',
    class: 'recent-searches',
  },
  imports: [IgntButtonComponent, IgntIconComponent, TranslateModule],
  selector: 'app-recent-searches-dropdown',
  styleUrl: './recent-searches-dropdown.component.scss',
  templateUrl: './recent-searches-dropdown.component.html',
})
export class RecentSearchesDropdownComponent {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #injector = inject(Injector);
  readonly #translate = inject(TranslateService);

  readonly searches = input.required<readonly RecentSearch[]>();
  readonly query = input<string>('');

  readonly cleared = output<void>();
  readonly removed = output<string>();
  readonly selected = output<string>();

  protected readonly titleId = `recent-searches-title-${nextId++}`;

  protected readonly items = computed<RecentSearchItem[]>(() => {
    const query = this.query().trim().toLowerCase();
    const now = Date.now();
    return this.searches().map(({ searchedAt, value }) => {
      const start = query === '' ? -1 : value.toLowerCase().indexOf(query);
      return {
        after: start === -1 ? '' : value.slice(start + query.length),
        before: start === -1 ? value : value.slice(0, start),
        match: start === -1 ? '' : value.slice(start, start + query.length),
        time: searchedAt === null ? null : recentSearchTimeLabel(searchedAt, now, this.#translate.currentLang ?? 'en'),
        value,
      };
    });
  });

  /** Called by the host field on ArrowDown, so the keyboard can reach the list without the mouse. */
  focusFirst(): void {
    this.#options()[0]?.focus();
  }

  protected handleKeydown(event: KeyboardEvent): void {
    const options = this.#options();
    const current = options.findIndex(option => option === document.activeElement);
    if (current === -1) {
      return;
    }
    const value = this.items()[current]?.value;
    if ((event.key === 'Enter' || event.key === ' ') && value !== undefined) {
      event.preventDefault();
      this.selected.emit(value);
      return;
    }
    if (event.key === 'Delete' && value !== undefined) {
      event.preventDefault();
      this.removed.emit(value);
      afterNextRender(
        () => {
          const remaining = this.#options();
          remaining[Math.min(current, remaining.length - 1)]?.focus();
        },
        { injector: this.#injector },
      );
      return;
    }
    const next = this.#nextIndex(event.key, current, options.length);
    if (next !== null) {
      event.preventDefault();
      options[next].focus();
    }
  }

  protected remove(event: MouseEvent, value: string): void {
    event.stopPropagation();
    this.removed.emit(value);
  }

  #nextIndex(key: string, current: number, count: number): number | null {
    switch (key) {
      case 'ArrowDown':
        return Math.min(current + 1, count - 1);
      case 'ArrowUp':
        return Math.max(current - 1, 0);
      case 'End':
        return count - 1;
      case 'Home':
        return 0;
      default:
        return null;
    }
  }

  #options(): HTMLElement[] {
    return Array.from(this.#host.nativeElement.querySelectorAll<HTMLElement>('.recent-searches__option'));
  }
}
