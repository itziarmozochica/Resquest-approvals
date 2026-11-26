import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

@Injectable({
  providedIn: 'root',
})
export class SchedulePermissionsService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #userService = inject(UserService);
  readonly #canModifyScheduleGranted = signal(this.#resolveCanModifyScheduleGranted());
  readonly #canViewSchedule = signal(this.#resolveCanViewSchedule());
  readonly #hasModifyPermissions = signal(this.#resolveHasModifyPermissions());
  readonly canModifySchedule = computed<boolean>(() => this.#hasModifyPermissions());
  readonly isScheduleEnabled = computed<boolean>(() => this.#canViewSchedule() || this.#canModifyScheduleGranted());

  constructor() {
    this.#userService
      .observePermissions()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#canModifyScheduleGranted.set(this.#resolveCanModifyScheduleGranted());
        this.#canViewSchedule.set(this.#resolveCanViewSchedule());
        this.#hasModifyPermissions.set(this.#resolveHasModifyPermissions());
      });
  }

  #resolveCanModifyScheduleGranted(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_MODIFY_SCHEDULE);
  }

  #resolveCanViewSchedule(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_VIEW_SCHEDULE);
  }

  #resolveHasModifyPermissions(): boolean {
    return (
      this.#resolveCanModifyScheduleGranted() ||
      this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS) ||
      this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS)
    );
  }
}
