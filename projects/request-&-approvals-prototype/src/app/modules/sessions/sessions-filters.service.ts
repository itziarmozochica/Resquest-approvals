import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { SearchFilter } from '../../shared/search-bar/models/search-filter.model';

@Injectable({
  providedIn: 'root',
})
export class SessionsFiltersService {
  private filters$: BehaviorSubject<SearchFilter | null> = new BehaviorSubject<SearchFilter | null>(null);

  constructor() {}

  getFilters(): Observable<SearchFilter | null> {
    return this.filters$.asObservable();
  }

  getFiltersSnapshot(): SearchFilter | null {
    return this.filters$.getValue();
  }

  updateFilters(filters: SearchFilter | null): void {
    this.filters$.next(filters);
  }
}
