import { AccessControlProfile } from '../../../../models/access-control/access-control.model';

export interface ValidationProfileSelectionModalData {
  profiles: AccessControlProfile[];
}

export interface ValidationProfileSelectionModalResult {
  profileId: string;
}
