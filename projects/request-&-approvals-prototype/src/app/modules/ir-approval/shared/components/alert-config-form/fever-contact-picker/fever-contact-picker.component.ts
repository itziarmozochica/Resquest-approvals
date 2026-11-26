import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AlertDirectoryRow } from '@fz-original/app/shared/services/alert-directory/alert-directory.model';
import { AlertDirectoryService } from '@fz-original/app/shared/services/alert-directory/alert-directory.service';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

import { FeverContactPicked } from '../../../models/fever-directory.model';

const PAGE_SIZE = 20;
const MIN_SEARCH_LENGTH = 2;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule],
  selector: 'app-fever-contact-picker',
  standalone: true,
  styleUrl: './fever-contact-picker.component.scss',
  templateUrl: './fever-contact-picker.component.html',
})
export class FeverContactPickerComponent implements OnDestroy {
  readonly partnerId = input<number | null>(null);
  readonly excludeEmails = input<readonly string[]>([]);
  readonly disabled = input<boolean>(false);

  readonly usersPicked = output<FeverContactPicked[]>();
  // Emitted on every keystroke so a parent can also filter its already-added list with the same bar.
  readonly termChange = output<string>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly term = signal('');
  readonly selected = signal<ReadonlyMap<string, FeverContactPicked>>(new Map());
  readonly page = signal(1);
  readonly results = signal<AlertDirectoryRow[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly searched = signal(false);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  readonly excludedNorms = computed(() => new Set(this.excludeEmails().map(email => email.trim().toLowerCase())));
  readonly minSearchLength = MIN_SEARCH_LENGTH;

  // When the directory search finds nobody, let the user add the typed value directly if it is a valid,
  // not-yet-added email — covers "if the user isn't found, tell you to add it".
  readonly canAddTyped = computed(() => {
    const value = this.term().trim();
    return this.#isEmail(value) && !this.excludedNorms().has(value.toLowerCase());
  });

  readonly #directoryService = inject(AlertDirectoryService);
  readonly #subscriptions: Subscription[] = [];
  #fetchSub: Subscription | null = null;

  constructor() {
    this.#subscriptions.push(
      // Immediate: keep the term in sync and let the parent filter its added list as you type.
      this.searchControl.valueChanges.subscribe(value => {
        this.term.set(value);
        this.termChange.emit(value);
      }),
      // Debounced: only hit the directory once typing settles.
      this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
        this.page.set(1);
        this.#fetch();
      }),
    );
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update(value => value - 1);
      this.#fetch();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update(value => value + 1);
      this.#fetch();
    }
  }

  isSelected(row: AlertDirectoryRow): boolean {
    return this.selected().has(row.emailNorm);
  }

  toggle(row: AlertDirectoryRow): void {
    if (this.isAdded(row)) {
      return;
    }
    const next = new Map(this.selected());
    if (next.has(row.emailNorm)) {
      next.delete(row.emailNorm);
    } else {
      next.set(row.emailNorm, { email: row.emailDisplay, name: row.emailDisplay, slackUserId: row.slackUserId });
    }
    this.selected.set(next);
  }

  selectedCount(): number {
    return this.selected().size;
  }

  addSelected(): void {
    const users = [...this.selected().values()];
    if (users.length === 0) {
      return;
    }
    this.usersPicked.emit(users);
    this.selected.set(new Map());
    this.searchControl.setValue('');
  }

  isAdded(row: AlertDirectoryRow): boolean {
    return this.excludedNorms().has(row.emailNorm);
  }

  addTyped(): void {
    const value = this.term().trim();
    if (!this.canAddTyped()) {
      return;
    }
    this.usersPicked.emit([{ email: value, name: value, slackUserId: null }]);
    this.searchControl.setValue('');
  }

  #isEmail(value: string): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
  }

  ngOnDestroy(): void {
    this.#subscriptions.forEach(sub => sub.unsubscribe());
    this.#fetchSub?.unsubscribe();
  }

  #fetch(): void {
    const term = this.searchControl.value.trim();
    const partnerId = this.partnerId();
    this.#fetchSub?.unsubscribe();
    if (partnerId == null || term.length < MIN_SEARCH_LENGTH) {
      this.results.set([]);
      this.total.set(0);
      this.searched.set(false);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.#fetchSub = this.#directoryService.searchFeverContacts(partnerId, term, this.page()).subscribe(response => {
      this.loading.set(false);
      this.searched.set(true);
      const rows = response.data?.rows ?? [];
      this.results.set(rows);
      this.total.set(response.data?.total ?? rows.length);
    });
  }
}
