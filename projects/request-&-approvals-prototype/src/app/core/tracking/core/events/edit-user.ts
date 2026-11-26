import { OrganizationUserResourceAccessTypeEnum } from '../../../../modules/settings/shared/models/organization-user-resource-access-type.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface EditUserData {
  name: string;
  email: string;
  role: string;
  resource_access_type: OrganizationUserResourceAccessTypeEnum;
  resources_number?: number;
}

export class EditUserEvent extends TrackingEvent<EditUserData> {
  constructor(readonly data: EditUserData) {
    super(TrackingEvents.EditUser, data);
  }
}
