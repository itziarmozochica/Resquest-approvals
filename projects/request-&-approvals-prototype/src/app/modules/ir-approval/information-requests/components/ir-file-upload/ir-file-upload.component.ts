import { ChangeDetectionStrategy, Component, EventEmitter, inject, input, Input, Output } from '@angular/core';

import { FzUploadComponent } from '@fz-original/app/modules/ir-approval/shared/components/fz-upload/fz-upload.component';
import {
  FzDriveCommit,
  FzFileCommit,
  FzPreviewResolver,
  FzTrackedUpload,
  FzUploadResult,
} from '@fz-original/app/modules/ir-approval/shared/models/fz-upload.model';
import { parseDriveUrl } from '@fz-original/app/shared/utils/google-drive-url.util';
import { TranslateModule } from '@ngx-translate/core';
import { map, Observable, of, tap } from 'rxjs';

import { fileKindsToExtensions, fileKindsToMimeTypes, InformationRequestFileKind } from '../../models/information-request-question.model';
import { InformationRequestUploadService } from '../../services/information-request-upload.service';
import { IrFileSyncTrackerService } from '../../services/ir-file-sync-tracker.service';
import { IrDriveImportNoticesComponent } from '../ir-drive-import-notices/ir-drive-import-notices.component';

/**
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FzUploadComponent, IrDriveImportNoticesComponent, TranslateModule],
  selector: 'app-ir-file-upload',
  standalone: true,
  styleUrls: ['./ir-file-upload.component.scss'],
  templateUrl: './ir-file-upload.component.html',
})
export class IrFileUploadComponent {
  @Input() testId = '';
  @Input() partnerId: number | null = null;
  @Input() projectId: string | null = null;
  @Input() informationRequestId: string | null = null;
  @Input() questionId = '';
  @Input() acceptedFileKinds: InformationRequestFileKind[] | null = null;
  @Input() fileAccept: string[] | null = null;
  @Input() disabled = false;
  @Input() multiple = false;

  @Output() uploaded = new EventEmitter<void>();

  readonly answeredImportJobIds = input<readonly string[]>([]);

  readonly parseDriveLink = parseDriveUrl;

  readonly #upload = inject(InformationRequestUploadService);
  readonly #fileSyncTracker = inject(IrFileSyncTrackerService, { optional: true });

  dismissTrackedUpload(sourceJobId: string): void {
    this.#fileSyncTracker?.dismissTrackedUpload(sourceJobId);
  }

  importStalled(): boolean {
    return this.#fileSyncTracker?.isStalled(this.questionId) ?? false;
  }

  trackedUploads(): readonly FzTrackedUpload[] {
    return this.#fileSyncTracker?.trackedUploads(this.questionId) ?? [];
  }

  acceptAttr(): string {
    if (this.fileAccept && this.fileAccept.length > 0) {
      return this.fileAccept.join(',');
    }
    return [...fileKindsToMimeTypes(this.acceptedFileKinds), ...fileKindsToExtensions(this.acceptedFileKinds)].join(',');
  }

  acceptedFormatsLabel(): string {
    const extensions = this.fileAccept && this.fileAccept.length > 0 ? this.fileAccept : fileKindsToExtensions(this.acceptedFileKinds);
    return extensions.join(', ');
  }

  acceptedMimeTypes(): string[] {
    return fileKindsToMimeTypes(this.acceptedFileKinds);
  }

  canUpload(): boolean {
    return this.partnerId !== null && !!this.informationRequestId && !!this.questionId;
  }

  isPhotoOrVideoField(): boolean {
    const kinds = this.acceptedFileKinds ?? [];
    return kinds.includes(InformationRequestFileKind.PHOTO) || kinds.includes(InformationRequestFileKind.VIDEO);
  }

  readonly uploadFile: FzFileCommit = (file, relativePath): Observable<FzUploadResult> => {
    if (!this.canUpload()) {
      return of<FzUploadResult>({ ok: false });
    }
    return this.#upload
      .uploadFromComputer(this.partnerId!, this.projectId, this.informationRequestId!, this.questionId, file, relativePath ?? '')
      .pipe(
        map(
          (response): FzUploadResult =>
            response.error ? { errorMessage: response.error.message, ok: false } : { id: response.data?.importJobId, ok: true },
        ),
        tap(result => {
          if (result.ok) {
            this.#fileSyncTracker?.recordUpload(this.questionId, result.id ? [result.id] : []);
            this.uploaded.emit();
          }
        }),
      );
  };

  readonly previewUploaded: FzPreviewResolver = item =>
    this.#upload.fetchFileUrl(this.partnerId!, this.projectId, this.informationRequestId!, this.questionId, item.id ?? '');

  readonly attachDrive: FzDriveCommit = (selection): Observable<FzUploadResult> => {
    if (!this.canUpload()) {
      return of<FzUploadResult>({ ok: false });
    }
    return this.#upload
      .uploadFromDrive(this.partnerId!, this.projectId, this.informationRequestId!, this.questionId, selection.driveFileId)
      .pipe(
        map((response): FzUploadResult => {
          const sourceJobId = response.data?.sourceJobId;
          const sourceStatus = response.data?.sourceStatus;
          if (response.error || !sourceJobId) {
            return { errorMessage: response.error?.message, ok: false };
          }
          if (sourceStatus === 'FAILED' || sourceStatus === 'STALLED') {
            return { ok: false };
          }
          this.#fileSyncTracker?.recordDriveImport(this.questionId, sourceJobId);
          this.uploaded.emit();
          return { ok: true, processing: true, trackingKey: sourceJobId };
        }),
      );
  };
}
