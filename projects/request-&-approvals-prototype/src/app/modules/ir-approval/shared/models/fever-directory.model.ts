import { AlertDirectoryRow } from '@fz-original/app/shared/services/alert-directory/alert-directory.model';

/** Organization users split by email domain: Fever PMs vs partner contacts. */
export interface FeverDirectoryRows {
  pmRows: AlertDirectoryRow[];
  partnerRows: AlertDirectoryRow[];
}

export interface FeverContactPicked {
  email: string;
  name: string;
  slackUserId: string | null;
}
