import { IgntAlertSentiment } from '@ignite/common';

import { IrLeftOutDriveFiles, IrLeftOutReason } from '../../models/drive-link-import.model';
import { DriveImportNotice } from './ir-drive-import-notices.model';

const messageKeyPrefix = 'informationRequests.question.file.';

export function toDriveImportNotices(leftOut: IrLeftOutDriveFiles): DriveImportNotice[] {
  const unsupported = notice('unsupported', 'driveLinkUnsupported', leftOut.unsupported, 'warning', '-skipped');
  const notices: DriveImportNotice[] = [
    { ...notice('failed', 'driveLinkFailed', leftOut.failed, 'danger', '-failed'), hintKey: messageKeyPrefix + 'driveLinkFailedHint' },
    notice('markedForDeletion', 'driveLinkMarkedForDeletion', leftOut.markedForDeletion, 'warning', '-marked-for-deletion'),
    leftOut.formats.length > 0
      ? { ...unsupported, hintKey: messageKeyPrefix + 'driveLinkUnsupportedFormats', hintParams: { formats: leftOut.formats.join(', ') } }
      : unsupported,
    notice('overLimit', 'driveLinkOverLimit', leftOut.overLimit, 'warning', '-over-limit'),
    notice('alreadyImported', 'driveLinkAlreadyImported', leftOut.alreadyImported, 'info', '-already-imported'),
  ];
  return notices.filter(({ files }) => files.length > 0);
}

function notice(
  reason: IrLeftOutReason,
  key: string,
  files: readonly string[],
  sentiment: IgntAlertSentiment,
  testIdSuffix: string,
): DriveImportNotice {
  return { files, leadKey: messageKeyPrefix + key, reason, sentiment, testIdSuffix };
}
