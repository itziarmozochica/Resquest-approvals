import { DOCUMENT, ViewportScroller } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Observable } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

export interface FragmentScrollOptions {
  behavior?: ScrollBehavior;
  delay?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class FragmentScrollService {
  #document = inject(DOCUMENT);
  #options: FragmentScrollOptions = {
    delay: 300,
    behavior: 'smooth',
    offset: 80,
  };
  #router = inject(Router);
  #viewportScroller = inject(ViewportScroller);

  initializeFragmentScroll(route?: ActivatedRoute, options: Partial<FragmentScrollOptions> = {}): Observable<string> {
    const activatedRoute = route || inject(ActivatedRoute);
    const mergedOptions = { ...this.#options, ...options };
    const { delay, behavior, offset } = mergedOptions;
    const initialFragment = activatedRoute.snapshot.fragment;

    if (initialFragment) {
      this.scrollToFragment(initialFragment, { delay, behavior, offset });
    }

    return activatedRoute.fragment.pipe(
      filter((fragment): fragment is string => fragment !== null && fragment !== ''),
      tap(fragment => {
        this.scrollToFragment(fragment, { delay, behavior, offset });
      }),
    );
  }

  navigateToFragment(fragment: string): void {
    this.#router.navigate([], {
      fragment,
      queryParamsHandling: 'preserve',
    });
  }

  scrollToFragment(fragment: string, options: Partial<FragmentScrollOptions> = {}): void {
    const mergedOptions = { ...this.#options, ...options };
    const { delay = 0, offset = 80 } = mergedOptions;

    const performScroll = () => {
      const element = this.#document.getElementById(fragment);
      if (element) {
        const elementPosition = element.getBoundingClientRect().top + (this.#document.defaultView?.pageYOffset ?? 0);
        const offsetPosition = Math.max(0, elementPosition - offset);
        this.#viewportScroller.scrollToPosition([0, offsetPosition]);
      } else {
        this.#viewportScroller.scrollToAnchor(fragment);
      }
    };

    if (delay > 0) {
      setTimeout(performScroll, delay);
    } else {
      performScroll();
    }
  }

  scrollToTop(): void {
    this.#viewportScroller.scrollToPosition([0, 0]);
  }
}
