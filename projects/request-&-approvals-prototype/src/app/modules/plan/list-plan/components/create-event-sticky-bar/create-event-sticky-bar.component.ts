import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { BootstrapBreakpointMediaQuery } from '@fz-original/app/app/enums/breakpoints.enum';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { fromEvent } from 'rxjs';
import { map, scan, tap } from 'rxjs/operators';

import { OboFlowTypeEnum } from '../../../../../modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '../../../../../modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { CreateEventEntryService } from '../../../../../shared/layout/create-event-entry/create-event-entry.service';
import { PlanRequestCreateVisibilityService } from '../../../../../shared/layout/create-event-entry/plan-request-create-visibility.service';
import { CreateEventVisibilityService } from '../../../../../shared/layout/header/create-event-visibility.service';
import { Permissions } from '../../../../../shared/services/user/permissions';
import { UserService } from '../../../../../shared/services/user/user.service';
import { createNewEvent } from '../../../tracking/events/create-new-event.event';
import { planTrackingProvider } from '../../../tracking/plan.tracking-provider';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  providers: [...planTrackingProvider()],
  selector: 'app-create-event-sticky-bar',
  standalone: true,
  styleUrl: './create-event-sticky-bar.component.scss',
  templateUrl: './create-event-sticky-bar.component.html',
})
export class CreateEventStickyBarComponent {
  readonly #breakpointObserver = inject(BreakpointObserver);
  readonly #createEventEntry = inject(CreateEventEntryService);
  readonly #createEventVisibilityService = inject(CreateEventVisibilityService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #planRequestCreateVisibility = inject(PlanRequestCreateVisibilityService);
  readonly #userService = inject(UserService);
  #lastScrollY: number | null = null;
  protected readonly isHiddenByScroll: WritableSignal<boolean> = signal(false);
  readonly #permissionsChange: Signal<number> = toSignal(
    this.#userService.observePermissions().pipe(scan((version: number) => version + 1, 0)),
    { initialValue: 0 },
  );
  readonly #isXsViewport: Signal<boolean> = toSignal(
    this.#breakpointObserver.observe(BootstrapBreakpointMediaQuery.xs).pipe(
      map((state: BreakpointState) => state.matches),
      tap((isXs: boolean) => {
        if (isXs) {
          this.isHiddenByScroll.set(false);
        }
      }),
    ),
    { initialValue: this.#breakpointObserver.isMatched(BootstrapBreakpointMediaQuery.xs) },
  );
  protected readonly isVisible: Signal<boolean> = computed(() => {
    this.#permissionsChange();

    return this.#isXsViewport() && this.#hasCreateEventPermission() && this.#isCreateEventAvailable();
  });
  protected readonly isHiddenFromAssistiveTech: Signal<boolean | null> = computed(() =>
    this.isVisible() && this.isHiddenByScroll() ? true : null,
  );
  protected readonly isInert: Signal<boolean> = computed(() => this.isVisible() && this.isHiddenByScroll());

  constructor() {
    fromEvent(window, 'scroll')
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.#onWindowScroll();
      });
  }

  protected handleCreateNewEvent(): void {
    this.#fzTracking.track(createNewEvent({ entry_point: this.#createEventEntry.getEntryPoint() }));
    this.#createEventEntry.handleHeaderCreateEvent();
  }

  #hasCreateEventPermission(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS) || this.#planRequestCreateVisibility.canShowCreateRequestDropdown()
    );
  }

  #isCreateEventAvailable(): boolean {
    return this.#createEventVisibilityService.isAvailable(this.#isOneStopShopMode());
  }

  #isOneStopShopMode(): boolean {
    return this.#onsiteSetupsStorageService.getConfiguration()?.obo_flow_type === OboFlowTypeEnum.one_stop_shop;
  }

  #onWindowScroll(): void {
    const currentScrollY: number = document.documentElement.scrollTop || document.body.scrollTop;
    if (this.#lastScrollY === null) {
      this.#lastScrollY = currentScrollY;
      return;
    }

    if (currentScrollY > this.#lastScrollY) {
      this.isHiddenByScroll.set(true);
    } else if (currentScrollY < this.#lastScrollY) {
      this.isHiddenByScroll.set(false);
    }

    this.#lastScrollY = currentScrollY;
  }
}
