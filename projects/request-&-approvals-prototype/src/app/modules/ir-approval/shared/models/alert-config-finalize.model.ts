import { AlertDirectoryRow } from '@fz-original/app/shared/services/alert-directory/alert-directory.model';

import { AlertConfigFormValue } from './alert-config.model';

export const alertDirectoryLoadingError = 'alert_directory_loading';
export const alertDirectoryLoadFailedError = 'alert_directory_load_failed';

export interface AlertDirectories {
  partnerDirectory: AlertDirectoryRow[];
  pmDirectory: AlertDirectoryRow[];
}

export type FinalizeAlertConfigResult = { ok: true; value: AlertConfigFormValue } | { ok: false; error: string };

/** A finalize error rendered either through an i18n key (+params) or as a raw passthrough string. */
export interface FinalizeErrorMessage {
  key?: string;
  params?: Record<string, string>;
  raw?: string;
}
