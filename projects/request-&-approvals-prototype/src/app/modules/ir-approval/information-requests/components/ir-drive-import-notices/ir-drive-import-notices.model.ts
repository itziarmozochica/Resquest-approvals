import { IgntAlertSentiment } from '@ignite/common';

import { IrLeftOutReason } from '../../models/drive-link-import.model';

export interface DriveImportNotice {
  files: readonly string[];
  leadKey: string;
  reason: IrLeftOutReason;
  sentiment: IgntAlertSentiment;
  testIdSuffix: string;
  hintKey?: string;
  hintParams?: Record<string, string>;
}
