import { inject, Injectable } from '@angular/core';

import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TranslateService } from '@ngx-translate/core';

import { CreateEventType } from '../create-event.model';
import { CREATE_EVENT_TYPE_CONFIGS, CreateEventTypeConfig } from '../models/create-event-type-config.model';

@Injectable({ providedIn: 'root' })
export class CreateEventTypeService {
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  getAvailableTypeConfigs(): CreateEventTypeConfig[] {
    return CREATE_EVENT_TYPE_CONFIGS.filter(config => !(config.permission && !this.#userService.hasPermission(config.permission)));
  }

  getAvailableTypes(): CreateEventType[] {
    return this.getAvailableTypeConfigs().map(config => config.type);
  }

  getTypeLabel(type: CreateEventType): string {
    return this.#translateService.instant(`createEvent.types.${type}`);
  }
}
