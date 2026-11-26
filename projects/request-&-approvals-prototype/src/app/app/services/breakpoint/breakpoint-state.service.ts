import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BootstrapBreakpointMediaQuery } from '@fz-original/app/app/enums/breakpoints.enum';
import { Constructor } from '@fz-original/app/app/mixins/constructor';
import { emptyBase } from '@fz-original/app/app/mixins/empty';
import { StateMixin } from '@fz-original/app/app/mixins/state/state.mixin';
import { AppBreakpointState } from '@fz-original/app/app/models/breakpoint-state.model';
import { getEnumValues, isBoolean } from '@fz-original/app/app/utils/ts/ts.util';
import { tap } from 'rxjs';

import { breakpointStateInitial } from './breakpoint-state.initial';

/**
 * @deprecated Use IgntMediaQueriesService instead
 * @see {@link IgntMediaQueriesService}
 */
@Injectable({
  providedIn: 'root',
})
export class BreakpointStateService extends StateMixin<Constructor, AppBreakpointState>(emptyBase, breakpointStateInitial) {
  #breakpointObserver = inject(BreakpointObserver);

  observeBreakpoint(destroyRef: DestroyRef, callback?: (breakpointState: BreakpointState) => void): void {
    this.#breakpointObserver
      .observe(getEnumValues(BootstrapBreakpointMediaQuery))
      .pipe(
        tap((breakpointState: BreakpointState) => {
          const matchingBreakpointPair: [string, boolean] | undefined = Object.entries(breakpointState.breakpoints).find(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ([_, matches]) => matches,
          );
          if (matchingBreakpointPair !== undefined) {
            const matchingBreakpoint: string = matchingBreakpointPair[0];
            const resetState: AppBreakpointState = this.#resetMatchingBreakpointStateProps();
            switch (matchingBreakpoint) {
              case BootstrapBreakpointMediaQuery.xs: {
                this.updateState({ ...resetState, isMobile: true });
                break;
              }
              case BootstrapBreakpointMediaQuery.sm: {
                this.updateState({ ...resetState, isMobile: true });
                break;
              }
              case BootstrapBreakpointMediaQuery.md: {
                this.updateState({ ...resetState, isTablet: true });
                break;
              }
              case BootstrapBreakpointMediaQuery.lg: {
                this.updateState({ ...resetState, isSmallDesktop: true });
                break;
              }
              case BootstrapBreakpointMediaQuery.xl: {
                this.updateState({ ...resetState, isDesktop: true });
                break;
              }
              case BootstrapBreakpointMediaQuery.xxl: {
                this.updateState({ ...resetState, isDesktop: true });
                break;
              }
            }
          }
        }),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((breakpointState: BreakpointState) => {
        if (callback !== undefined) {
          callback(breakpointState);
        }
      });
  }

  #resetMatchingBreakpointStateProps(): AppBreakpointState {
    const resetState: AppBreakpointState = this.state();
    for (const [key, value] of Object.entries(this.state())) {
      if (isBoolean(value)) {
        resetState[key as keyof AppBreakpointState] = false;
      }
    }

    return resetState;
  }
}
