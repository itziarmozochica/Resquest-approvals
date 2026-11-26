import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { SearchFilter } from '../../search-bar/models/search-filter.model';

@Injectable({
  providedIn: 'root',
})
export class SearchFiltersService {
  private filters$ = new BehaviorSubject<SearchFilter | null>(null);

  getFilters(): Observable<SearchFilter | null> {
    return this.filters$.asObservable() as Observable<SearchFilter | null>;
  }

  updateFilters(filters: SearchFilter | null): void {
    this.filters$.next(filters);
  }

  resetFilters(): void {
    this.filters$.next(null);
  }
}
