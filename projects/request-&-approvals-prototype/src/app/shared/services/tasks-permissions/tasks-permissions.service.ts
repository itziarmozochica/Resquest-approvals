import { inject, Injectable } from '@angular/core';

import { defer, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Permissions } from '../user/permissions';
import { UserService } from '../user/user.service';

/** Tasks lists the jobs a partner can launch. Each permission here can start at least one of those jobs, so any one of them opens the screen. */
const tasksAccessPermissions = [
  Permissions.CAN_CREATE_BULK_EDIT_INVENTORY_REQUEST,
  Permissions.CAN_CANCEL_SESSIONS,
  Permissions.CAN_EDIT_SESSION,
  Permissions.CAN_MODIFY_TICKET_TYPES,
  Permissions.CAN_CREATE_QUOTAS,
  Permissions.CAN_EDIT_QUOTAS,
  Permissions.CAN_MODIFY_SCHEDULE,
  Permissions.CAN_CREATE_PLANS,
  Permissions.CAN_MANAGE_PLAN_REVIEWS,
  Permissions.CAN_MODIFY_PRICE_LISTS,
  Permissions.CAN_MANAGE_STOCK,
] as const;

@Injectable({
  providedIn: 'root',
})
export class TasksPermissionsService {
  readonly #userService = inject(UserService);

  isTasksEnabled(): boolean {
    return tasksAccessPermissions.some(permission => this.#userService.hasPermission(permission));
  }

  isTasksEnabledOnceLoaded(): Observable<boolean> {
    return defer(() => this.#userService.getPermissionsInOrganization()).pipe(map(() => this.isTasksEnabled()));
  }
}
