import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EMPTY, NEVER, Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

export type InputFilters = { [key: string | number]: unknown };

export enum State {
  noFiltersSelected = 'noFilterSelected',
  noResults = 'noResults',
  withResults = 'withResults',
  error = 'error',
}

@Component({
  selector: 'app-unpaginated-table-container',
  standalone: false,
  templateUrl: './unpaginated-table-container.component.html',
  styleUrls: ['./unpaginated-table-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnpaginatedTableContainerComponent<T> implements OnChanges {
  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  @Input() checkHasMandatoryFilters: (filters: InputFilters) => boolean;
  @Input() checkIsEmpty: (data: T) => boolean;
  currentState: State = State.noFiltersSelected;
  @Input() errorMessage = '';
  @Input() errorTemplate: TemplateRef<unknown> | undefined = undefined;
  @Input({ required: true }) filters!: InputFilters;
  hasMandatoryFilters = false;
  isLoading = false;
  lastQuery: InputFilters | null = null;
  @Input() noFiltersIcon: [string, string] = ['', ''];
  @Input() noFiltersMessage = '';
  @Input() noFiltersTemplate: TemplateRef<unknown> | undefined = undefined;
  @Input() noResultIcon: [string, string] = ['', ''];
  @Input() noResultMessage = '';
  @Input() noResultsTemplate: TemplateRef<unknown> | undefined = undefined;
  /** Off when the content draws its own end, such as a bordered box. */
  @Input() showEndOfResults = true;
  /** Off when the content shows its own loading state, such as a skeleton. */
  @Input() showLoader = true;
  @Input() request: (filters: InputFilters) => Observable<T>;
  searchResultItems: T | null = null;
  @Output() searchResults = new EventEmitter<T | null>();
  stateEnum = State;

  constructor() {
    this.request = () => NEVER;
    this.checkHasMandatoryFilters = () => true;
    this.checkIsEmpty = () => true;
    this.#resetSearch();
  }

  ngOnChanges({ filters }: SimpleChanges): void {
    if (filters?.currentValue) {
      this.#resetSearch();
      this.#changeDetectorRef.markForCheck();
      this.lastQuery = filters.currentValue;
      this.hasMandatoryFilters = this.checkHasMandatoryFilters(filters.currentValue);
      if (this.hasMandatoryFilters) {
        this.currentState = State.withResults;
      }
      this.isLoading = true;
      this.#changeDetectorRef.markForCheck();

      this.request(this.lastQuery !== null ? this.lastQuery : {})
        .pipe(
          catchError(() => {
            this.currentState = State.error;
            return EMPTY;
          }),
          tap(response => {
            this.searchResultItems = this.checkIsEmpty(response) ? null : response;
            this.currentState = !this.searchResultItems ? State.noResults : State.withResults;
            this.searchResults.emit(this.searchResultItems);
          }),
          finalize(() => {
            this.isLoading = false;
            this.#changeDetectorRef.markForCheck();
          }),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe();
    }
  }

  #resetSearch(): void {
    this.hasMandatoryFilters = false;
    this.currentState = State.noFiltersSelected;
    this.searchResultItems = null;
    this.searchResults.emit(this.searchResultItems);
  }
}
