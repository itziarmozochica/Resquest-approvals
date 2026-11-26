import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationExtras, NavigationStart, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  #MAX_HISTORY_LEN = 10;

  #history: string[] = [];
  #location = inject(Location);
  #replaceNextHistoryEntry = false;
  #router = inject(Router);

  get history(): string[] {
    return this.#history;
  }

  get previousUrl(): string | undefined {
    const previousUrl = this.history.length > 0 ? this.history[this.history.length - 1] : undefined;

    if (previousUrl === window.location.pathname + window.location.search) {
      return this.history.length > 1 ? this.history[this.history.length - 2] : undefined;
    }

    return previousUrl;
  }

  constructor() {
    this.#addToHistory(this.getCurrentUrl());

    this.#router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.#replaceNextHistoryEntry = this.#router.getCurrentNavigation()?.extras.replaceUrl === true;
      }

      if (event instanceof NavigationEnd) {
        this.#addToHistory(event.urlAfterRedirects, this.#replaceNextHistoryEntry);
        this.#replaceNextHistoryEntry = false;
      }

      if (event instanceof NavigationCancel || event instanceof NavigationError) {
        this.#replaceNextHistoryEntry = false;
      }
    });

    window.addEventListener('popstate', () => {
      this.#addToHistory(this.getCurrentUrl());
    });
  }

  back(): void {
    if (this.#history.length > 1) {
      this.#location.back();
    } else {
      this.#router.navigateByUrl('/');
    }

    this.#history.pop();
  }

  /**
   * Returns to `fallbackRoute` without stacking a history entry: when the previous in-app entry
   * already is that route (query params aside), going back restores it as the browser gestures
   * would; a deep link has no such entry, so it falls back to a navigation that merges the current
   * query params, matching the push-based back affordances it replaces.
   */
  backTo(fallbackRoute: string): void {
    const [previousPath] = (this.previousUrl ?? '').split(/[?#]/);

    if (previousPath === fallbackRoute) {
      this.#location.back();
      this.#history.pop();
      return;
    }

    this.#router.navigate([fallbackRoute], { queryParamsHandling: 'merge' });
  }

  getCurrentUrl(): string {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  navigate(url: string[], extras?: NavigationExtras): void {
    this.#router.navigate(url, extras);
  }

  trackNavigation(url: string): void {
    this.#addToHistory(url);
  }

  #addToHistory(url: string, replace = false): void {
    if (this.#history.length === 0) {
      this.#history.push(url);
      return;
    }

    if (this.#history[this.#history.length - 1] === url) {
      return;
    }

    if (replace) {
      this.#history[this.#history.length - 1] = url;
      return;
    }

    this.#history.push(url);
    if (this.#history.length > this.#MAX_HISTORY_LEN) {
      this.#history.shift();
    }
  }
}
