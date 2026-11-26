import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import { InformationRequest } from './information-request.model';

export type DriveSourceJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'STALLED';

export interface DriveLinkImport {
  acceptedCount: number;
  acceptedExtensions: string[];
  alreadyImportedFiles: string[];
  enqueuedCount: number;
  failedFiles: string[];
  importJobIds: string[];
  overLimitFiles: string[];
  questionId: string;
  skippedFiles: string[];
  sourceDriveFileId: string;
  sourceJobId: string;
  sourceName: string;
  sourceStatus: DriveSourceJobStatus;
}

export interface IrLeftOutDriveFiles {
  alreadyImported: string[];
  failed: string[];
  formats: string[];
  markedForDeletion: string[];
  overLimit: string[];
  unsupported: string[];
}

export type IrLeftOutReason = Exclude<keyof IrLeftOutDriveFiles, 'formats'>;

export interface InformationRequestWithDriveLinkImports {
  imports: DriveLinkImport[] | null;
  response: BaseResponse<InformationRequest | null>;
}
