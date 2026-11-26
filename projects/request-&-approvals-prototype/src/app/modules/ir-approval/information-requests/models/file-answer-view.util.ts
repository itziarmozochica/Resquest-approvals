import { isBrowserViewable } from '@fz-original/app/modules/ir-approval/shared/utils/browser-preview.util';

import { InformationRequestFileAnswer, isFileAnswerInDrive } from './information-request-question.model';

export function canViewFileAnswer(file: InformationRequestFileAnswer): boolean {
  return (file.importJobId ?? '') === '' ? isFileAnswerInDrive(file) : isBrowserViewable(file.mimeType, file.originalName);
}
