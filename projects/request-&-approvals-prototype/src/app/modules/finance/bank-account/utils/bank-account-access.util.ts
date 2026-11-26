import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

export function hasBankAccountPermission(userService: UserService): boolean {
  return [Permissions.CAN_MANAGE_BANK_ACCOUNTS, Permissions.CAN_REVIEW_BANK_ACCOUNTS].some((permission: Permissions) =>
    userService.hasPermission(permission),
  );
}
