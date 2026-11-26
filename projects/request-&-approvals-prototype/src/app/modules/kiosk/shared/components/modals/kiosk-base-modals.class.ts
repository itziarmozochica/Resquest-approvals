import { UserService } from '@fz-original/app/shared/services/user/user.service';

export abstract class KioskBaseModal {
  constructor(protected userService: UserService) {}

  isKioskEmulatedInFZ(): boolean {
    return !this.userService.isKioskUser();
  }
}
