import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, Subject } from 'rxjs';

import { CreateEventEntryPoint } from '../../../modules/plan/tracking/models/plan-tracking.model';
import { Permissions } from '../../services/user/permissions';
import { UserService } from '../../services/user/user.service';

@Injectable({ providedIn: 'root' })
export class CreateEventEntryService {
  static readonly eventsListUrl = '/plans';
  static readonly planRequestUrl = '/plans/requests';
  readonly #openPanelRequested$ = new Subject<void>();
  readonly #router = inject(Router);
  readonly #userService = inject(UserService);
  readonly openPanelRequested$: Observable<void> = this.#openPanelRequested$.asObservable();

  getEntryPoint(): CreateEventEntryPoint {
    return this.#isOnEventsList() ? 'events_list' : 'header';
  }

  handleHeaderCreateEvent(): void {
    if (!this.#canUseNewCreateFlow()) {
      this.#router.navigate([CreateEventEntryService.planRequestUrl]);
      return;
    }
    if (this.#isOnEventsList()) {
      this.#openPanelRequested$.next();
      return;
    }
    this.#router.navigate([CreateEventEntryService.eventsListUrl], {
      state: { openCreateEventPanel: true },
    });
  }

  #canUseNewCreateFlow(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS);
  }

  #isOnEventsList(): boolean {
    const rawUrl: string = this.#router.url;
    const baseUrl: string = rawUrl.split('?')[0].split('#')[0];
    return baseUrl === CreateEventEntryService.eventsListUrl;
  }
}
