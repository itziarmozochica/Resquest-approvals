import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { FormInputFieldType } from '@fz-original/app/app/enums/html-tag.enum';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import type { IgntInputFieldType } from '@ignite/legacy/models/ignt-input.model';
import { debounceTime, map } from 'rxjs/operators';

import type { IgntTableSearchConfig } from '../models/ignt-table-search-field.model';
import { IgntTableTranslationsDirective } from '../table-translations.directive';

export const SEARCH_DEBOUNCE_MS = 800 as const;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [IgntTableTranslationsDirective],
  imports: [IgntInputFieldComponent, ReactiveFormsModule],
  selector: 'ignt-table-search',
  standalone: true,
  styleUrl: './ignt-table-search.component.scss',
  templateUrl: './ignt-table-search.component.html',
})
export class IgntTableSearchComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #translations = inject(IgntTableTranslationsDirective).translations;

  /**
   * The term this component last emitted, or the one the host last pushed in.
   *
   * `distinctUntilChanged()` used to hold this, and it only ever saw what the control emitted: a term
   * the host cleared arrived through `setValue(…, { emitEvent: false })`, so the operator went on
   * holding the old term and the same term typed again was swallowed for good.
   */
  #lastEmitted: string | null = null;

  /**
   * Bumped every time the host overwrites the field.
   *
   * `setValue(…, { emitEvent: false })` leaves any in-flight `debounceTime()` running, so a keystroke
   * typed before a host clear would still land after it — filtering the table by a term the host has
   * already discarded, and one the field no longer shows. Stamping each keystroke on its way into the
   * pipe is what lets the subscriber tell those apart from the ones typed since.
   */
  #hostRevision = 0;

  readonly config = input.required<IgntTableSearchConfig>();
  readonly searchChanged = output<string>();

  readonly searchControl = new FormControl<string>('', { nonNullable: true });
  protected readonly searchFieldId = 'ignt-table-search-input';
  protected readonly searchInputType = FormInputFieldType[FormInputFieldType.search] as IgntInputFieldType;
  protected readonly searchLeadIcon: [string, string] = ['far', 'search'];
  protected readonly searchLabel = computed(() => this.#translations().searchLabel);
  protected readonly searchHelperText = computed(() => this.#translations().searchHelperText);

  constructor() {
    effect(() => {
      const query = this.config().searchQuery;
      untracked(() => {
        if (this.searchControl.value !== query) {
          this.searchControl.setValue(query, { emitEvent: false });
          this.#lastEmitted = query;
          this.#hostRevision += 1;
        }
      });
    });

    effect(() => {
      const disabled = this.config().isDisabled ?? false;
      untracked(() => {
        if (disabled) {
          this.searchControl.disable({ emitEvent: false });
        } else {
          this.searchControl.enable({ emitEvent: false });
        }
      });
    });

    this.searchControl.valueChanges
      .pipe(
        map(value => ({ revision: this.#hostRevision, value })),
        debounceTime(SEARCH_DEBOUNCE_MS),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ revision, value }) => {
        if (revision !== this.#hostRevision || value === this.#lastEmitted) {
          return;
        }

        this.#lastEmitted = value;
        this.searchChanged.emit(value);
      });
  }
}
