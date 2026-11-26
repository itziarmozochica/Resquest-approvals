import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { computed, inject, Injectable } from '@angular/core';

import { patchState, signalState } from '@ngrx/signals';

import { IgntMediaQueriesState, mediaQueriesInitialState } from './models/media-queries';

@Injectable({
  providedIn: 'root',
})
export class IgntMediaQueriesService {
  readonly #breakpointObserver = inject(BreakpointObserver);
  readonly #state = signalState<IgntMediaQueriesState>(mediaQueriesInitialState);

  /**
   * Breakpoints to observe
   * These must be aligned with the breakpoints in the theme/src/abstracts/variables/_breakpoints.scss file.
   *
   * @see projects/ignite/theme/src/abstracts/variables/_breakpoints.scss
   * @see projects/ignite/theme/src/abstracts/mixins/_media-breakpoint.scss
   */
  static readonly breakpoints: Map<string, string> = new Map<string, string>([
    ['mobile', '(max-width: 599.98px)'],
    ['tablet', '(min-width: 600px) and (max-width: 899.98px)'],
    ['desktopSm', '(min-width: 900px) and (max-width: 1199.98px)'],
    ['desktopMd', '(min-width: 1200px) and (max-width: 1799.98px)'],
    ['desktopLg', '(min-width: 1800px)'],
  ]);

  /**
   * Desktop LG media query
   */
  readonly isDesktopLg = computed<boolean>(() => this.#state.desktopLg());
  /**
   * Desktop MD media query
   */
  readonly isDesktopMd = computed<boolean>(() => this.#state.desktopMd());
  /**
   * Desktop SM media query
   */
  readonly isDesktopSm = computed<boolean>(() => this.#state.desktopSm());
  /**
   * Any desktop media query. Includes LG, MD and SM.
   */
  readonly isAnyDesktop = computed<boolean>(() => this.isDesktopLg() || this.isDesktopMd() || this.isDesktopSm());
  /**
   * Mobile media query
   */
  readonly isMobile = computed<boolean>(() => this.#state.mobile());
  /**
   * Tablet media query
   */
  readonly isTablet = computed<boolean>(() => this.#state.tablet());

  initialize(): void {
    if (this.#state().isInitialized) {
      throw new Error('Ignt: IgntMediaQueriesService already initialized');
    }
    patchState(this.#state, state => ({ ...state, isInitialized: true }));

    this.#breakpointObserver
      .observe(Array.from(IgntMediaQueriesService.breakpoints.values()))
      .subscribe((cdkBreakpointState: BreakpointState) => {
        if (!cdkBreakpointState.matches) {
          return;
        }

        const newState: IgntMediaQueriesState = this.#calculateBreakpointState(cdkBreakpointState);
        patchState(this.#state, state => ({ ...state, ...newState }));
      });
  }

  #calculateBreakpointState(cdkBreakpointState: BreakpointState): IgntMediaQueriesState {
    return Array.from(IgntMediaQueriesService.breakpoints.entries()).reduce(
      (acc, [breakpointName, breakpointDef]) => ({ ...acc, [breakpointName]: cdkBreakpointState.breakpoints[breakpointDef] }),
      {} as IgntMediaQueriesState,
    );
  }
}
