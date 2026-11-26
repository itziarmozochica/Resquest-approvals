import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, inject, Input, Output, TemplateRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EMPTY, NEVER, Observable, ReplaySubject } from 'rxjs';
import { catchError, debounceTime, finalize, map, tap } from 'rxjs/operators';

import { LinkPaginationResponse } from '../../../shared/models/link-pagination-response';

export type InputFilters = { [key: string | number]: unknown };

export enum State {
  noFiltersSelected = 'noFilterSelected',
  noResults = 'noResults',
  withResults = 'withResults',
  error = 'error',
}

@Component({
  selector: 'app-paginated-table-container',
  standalone: false,
  templateUrl: './paginated-table-container.component.html',
  styleUrls: ['./paginated-table-container.component.scss'],
})
export class PaginatedTableContainerComponent {
  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  #filtersChangeSubject = new ReplaySubject<InputFilters>(1);
  #requestIndex = 0;
  @Input() set filters(newFilters: InputFilters) {
    this.#filtersChangeSubject.next(newFilters);
  }
  activatePagination = new ReplaySubject<boolean>(1);
  @Input() checkHasMandatoryFilters: (filters: InputFilters) => boolean;
  currentState: State = State.noFiltersSelected;
  @Input() errorMessage = '';
  @Input() errorTemplate: TemplateRef<unknown> | null = null;
  hasMandandatoryFilters = false;
  hasMorePages = false;
  isLoading = false;
  lastQuery: InputFilters | null = null;
  @Input() noFiltersIcon: [string, string] = ['', ''];
  @Input() noFiltersMessage = '';
  @Input() noFiltersTemplate: TemplateRef<unknown> | null = null;
  @Input() noResultIcon: [string, string] = ['', ''];
  @Input() noResultMessage = '';
  @Input() noResultsTemplate: TemplateRef<unknown> | null = null;
  @Input() requestPage: (filters: InputFilters, page: number) => Observable<LinkPaginationResponse<unknown[]>>;
  searchResultItems: unknown[] = [];
  @Output() searchResults = new EventEmitter<unknown[]>();
  stateEnum = State;

  constructor() {
    this.requestPage = () => NEVER;
    this.checkHasMandatoryFilters = () => true;
    this.#resetSearch();
    this.#filtersChangeSubject
      .pipe(
        debounceTime(250),
        tap(query => {
          this.#resetSearch();
          this.#changeDetectorRef.detectChanges();
          this.lastQuery = query;
          this.hasMandandatoryFilters = this.checkHasMandatoryFilters(query);
          if (this.hasMandandatoryFilters) {
            this.currentState = State.withResults;
            this.#changeDetectorRef.detectChanges();
          }
          this.activatePagination.next(this.hasMandandatoryFilters);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  pageRequestCallback = (page: number): Observable<boolean | never> => {
    if (this.lastQuery === null) {
      return NEVER;
    }

    return this.#getItemsPageRequest(this.lastQuery, page);
  };

  #getItemsPageRequest(filters: InputFilters, page: number): Observable<boolean> {
    const requestIndex: number = ++this.#requestIndex;
    this.currentState = State.withResults;
    this.isLoading = true;
    this.#changeDetectorRef.detectChanges();

    return this.requestPage(filters, page).pipe(
      catchError(() => {
        this.currentState = State.error;
        return EMPTY;
      }),
      tap(response => {
        this.#handleNewPage(response);
        this.currentState = this.searchResultItems.length === 0 ? State.noResults : State.withResults;
        this.searchResults.emit(this.searchResultItems);
      }),
      finalize(() => {
        if (requestIndex === this.#requestIndex) {
          this.isLoading = false;
        }
        this.#changeDetectorRef.detectChanges();
      }),
      map(response => {
        this.hasMorePages = Boolean(response.getNextPaginationPage());
        return this.hasMorePages;
      }),
    );
  }

  #handleNewPage(response: LinkPaginationResponse<unknown[]>) {
    this.searchResultItems = [...this.searchResultItems, ...(response.data || [])];
  }

  #resetSearch() {
    this.hasMorePages = true;
    this.hasMandandatoryFilters = false;
    this.currentState = State.noFiltersSelected;
    this.searchResultItems = [];
    this.searchResults.emit(this.searchResultItems);
  }
}
