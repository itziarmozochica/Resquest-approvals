import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { DescriptionPromptDialogComponent } from '@fz-original/app/modules/ir-approval/shared/components/description-prompt-dialog/description-prompt-dialog.component';
import { FzUploadComponent } from '@fz-original/app/modules/ir-approval/shared/components/fz-upload/fz-upload.component';
import {
  DescriptionPromptDialogData,
  DescriptionPromptDialogResult,
} from '@fz-original/app/modules/ir-approval/shared/models/description-prompt-dialog.model';
import {
  FzDriveCommit,
  FzFileCommit,
  FzPreviewResolver,
  FzUploadItem,
  FzUploadResult,
} from '@fz-original/app/modules/ir-approval/shared/models/fz-upload.model';
import {
  APPROVAL_UPLOAD_ACCEPT,
  APPROVAL_UPLOAD_FORMATS_LABEL,
  APPROVAL_UPLOAD_MIME_TYPES,
} from '@fz-original/app/modules/ir-approval/shared/upload/approval-upload-formats';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntButtonComponent, IgntDialogService } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { map, of, take } from 'rxjs';

import { parseDriveUrl } from '../../containers/approval-new/approval-new.drive-url';
import { ApprovalDriveFileSelection, isApprovalDriveFileSelectionActive } from '../../models/approval-drive-file.model';
import { ApprovalAsset } from '../../models/approval.model';
import { ApprovalAssetsService, DriveFileValidation } from '../../services/approval-assets.service';
import { ApprovalsService } from '../../services/approvals.service';
import { uploadedAssetRelativePaths } from '../../utils/approval-asset-relative-paths.util';
import { ApprovalDriveFileTreeComponent } from '../approval-drive-file-tree/approval-drive-file-tree.component';

/** Kind of item a sent approval accepts more of. */
export type ApprovalAddItemsKind = 'url' | 'asset';

interface DrivePreflightSummary extends DriveFileValidation {
  driveFileId: string;
  rootUrl?: string | null;
  selectedChildDriveFileIds?: string[];
}

@Component({
  selector: 'app-approval-add-items',
  templateUrl: './approval-add-items.component.html',
  styleUrls: ['./approval-add-items.component.scss'],
  imports: [ReactiveFormsModule, TranslateModule, IgntButtonComponent, FzUploadComponent, ApprovalDriveFileTreeComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalAddItemsComponent {
  readonly partnerId = input<number | null>(null);
  readonly launchId = input<string>('');
  readonly approvalId = input<string>('');
  readonly description = input<string>('');
  readonly kind = input<ApprovalAddItemsKind>('url');
  readonly disabled = input<boolean>(false);

  /** Emitted after items were appended and the approval was re-sent for validation. */
  readonly added = output<void>();

  readonly open = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly error = signal<boolean>(false);
  // URL approvals: URLs are added one at a time and collected here before sending.
  readonly urlInput = new FormControl<string>('', { nonNullable: true });
  readonly addedUrls = signal<string[]>([]);

  readonly mediaMimeTypes = APPROVAL_UPLOAD_MIME_TYPES;
  readonly mediaAccept = APPROVAL_UPLOAD_ACCEPT;
  readonly mediaFormatsLabel = APPROVAL_UPLOAD_FORMATS_LABEL;
  readonly parseDriveUrl = parseDriveUrl;
  readonly driveFolderMimeType = 'application/vnd.google-apps.folder';

  readonly #uploadItems = signal<FzUploadItem[]>([]);
  readonly #driveValidationById = signal<Record<string, DriveFileValidation>>({});
  readonly #selectedDriveFileIdsByRoot = signal<Record<string, string[] | undefined>>({});
  readonly drivePreflightSummaries = computed<DrivePreflightSummary[]>(() => {
    const summaries = this.#driveValidationById();
    const selections = this.#selectedDriveFileIdsByRoot();
    return this.#uploadItems()
      .filter(item => item.source === 'drive' && item.status === 'uploaded' && item.driveFileId)
      .flatMap(item => {
        const summary = summaries[item.driveFileId!];
        return summary
          ? [
              {
                driveFileId: item.driveFileId!,
                rootUrl: item.url ?? null,
                selectedChildDriveFileIds: selections[item.driveFileId!],
                ...summary,
              },
            ]
          : [];
      });
  });
  readonly #service = inject(ApprovalsService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #assetsService = inject(ApprovalAssetsService);
  readonly #email = inject(UserService).getUser()?.email ?? '';
  readonly #destroyRef = inject(DestroyRef);

  readonly assetCommit: FzFileCommit = file => {
    const partnerId = this.partnerId();
    if (partnerId === null) {
      return of<FzUploadResult>({ ok: false, errorMessage: 'approvals.upload.errors.partnerUnavailable' });
    }
    return this.#assetsService.upload(partnerId, this.#effectiveLaunchId(), file).pipe(map(toAssetResult));
  };

  readonly previewAsset: FzPreviewResolver = item =>
    this.#assetsService.fetchAssetUrl(this.partnerId() ?? 0, this.#effectiveLaunchId(), item.id ?? '');

  readonly validateDrive: FzDriveCommit = selection => {
    const partnerId = this.partnerId();
    if (partnerId === null) {
      return of<FzUploadResult>({ ok: false, errorMessage: 'approvals.upload.errors.partnerUnavailable' });
    }
    return this.#assetsService.validateDriveFile(partnerId, this.#effectiveLaunchId(), selection.driveFileId).pipe(
      map((response): FzUploadResult => {
        if (response.error || !response.data) {
          this.#forgetDriveValidation(selection.driveFileId);
          return { ok: false, errorMessage: driveValidationErrorKey(response.error?.code) };
        }
        if (!hasDrivePreflightSummary(response.data)) {
          this.#forgetDriveValidation(selection.driveFileId);
          return { ok: true };
        }
        if ((response.data.acceptedCount ?? 0) < 1) {
          this.#forgetDriveValidation(selection.driveFileId);
          return { ok: false, errorMessage: 'approvals.new.upload.noImportableDriveFiles' };
        }
        this.#rememberDriveValidation(selection.driveFileId, response.data);
        return { ok: true };
      }),
    );
  };

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.error.set(false);
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    this.error.set(false);
    if (this.kind() === 'asset') {
      this.#resetAssetDraft();
    }
  }

  onUploadItemsChange(items: FzUploadItem[]): void {
    this.#uploadItems.set(items);
    this.#pruneDriveValidationSummaries(items);
    this.#syncDriveSelectionState(items);
  }

  onDriveFileSelectionChange(driveFileId: string, selectedDriveFileIds: string[]): void {
    this.#selectedDriveFileIdsByRoot.update(current => ({ ...current, [driveFileId]: selectedDriveFileIds }));
  }

  addUrl(): void {
    const value = this.urlInput.value.trim();
    if (!value || this.addedUrls().includes(value)) {
      return;
    }
    this.addedUrls.update(urls => [...urls, value]);
    this.urlInput.setValue('');
  }

  removeUrl(index: number): void {
    this.addedUrls.update(urls => urls.filter((_, position) => position !== index));
  }

  canSubmit(): boolean {
    if (this.disabled() || this.submitting()) {
      return false;
    }
    return this.kind() === 'url'
      ? this.addedUrls().length > 0
      : this.#assetIds().length > 0 || this.#driveFiles().some(isApprovalDriveFileSelectionActive);
  }

  submit(): void {
    const partnerId = this.partnerId();
    if (partnerId === null || !this.approvalId() || !this.canSubmit()) {
      return;
    }
    this.#dialogService
      .openModal<DescriptionPromptDialogResult, DescriptionPromptDialogData>(DescriptionPromptDialogComponent, {
        data: { hintKey: 'descriptionPrompt.editHint', value: this.description() },
        size: 'sm',
      })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(description => {
        if (description === undefined) {
          return;
        }
        this.#send(partnerId, description);
      });
  }

  #assetIds(): string[] {
    return this.#uploadItems()
      .filter(item => item.source === 'computer' && item.status === 'uploaded' && item.id)
      .map(item => item.id as string);
  }

  #driveFiles(): ApprovalDriveFileSelection[] {
    const selections = this.#selectedDriveFileIdsByRoot();
    return this.#uploadItems()
      .filter(item => item.source === 'drive' && item.status === 'uploaded')
      .map(item => ({
        driveFileId: item.driveFileId as string,
        name: item.name,
        mimeType: item.mimeType ?? '',
        url: item.url,
        selectedChildDriveFileIds: selections[item.driveFileId as string],
      }));
  }

  /**
   * `null` for a standalone approval not linked to any launch, which routes the asset and add-items calls to
   * the partner scope. A missing launch is expected there; only a missing partner is a genuine blocker.
   */
  #effectiveLaunchId(): string | null {
    return this.launchId() || null;
  }

  #rememberDriveValidation(driveFileId: string, validation: DriveFileValidation): void {
    this.#driveValidationById.update(current => ({ ...current, [driveFileId]: validation }));
  }

  #forgetDriveValidation(driveFileId: string): void {
    this.#driveValidationById.update(current => {
      if (!(driveFileId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[driveFileId];
      return next;
    });
  }

  #pruneDriveValidationSummaries(items: FzUploadItem[]): void {
    const allowed = new Set(
      items
        .filter(item => item.source === 'drive' && item.status === 'uploaded' && item.driveFileId)
        .map(item => item.driveFileId as string),
    );
    this.#driveValidationById.update(current =>
      Object.fromEntries(Object.entries(current).filter(([driveFileId]) => allowed.has(driveFileId))),
    );
  }

  #syncDriveSelectionState(items: FzUploadItem[]): void {
    const validations = this.#driveValidationById();
    this.#selectedDriveFileIdsByRoot.update(current =>
      Object.fromEntries(
        items
          .filter(item => item.source === 'drive' && item.status === 'uploaded' && item.driveFileId)
          .map(item => {
            const driveFileId = item.driveFileId as string;
            return [driveFileId, current[driveFileId] ?? defaultSelectedDriveFileIds(validations[driveFileId])] as const;
          }),
      ),
    );
  }

  #resetAssetDraft(): void {
    this.#uploadItems.set([]);
    this.#driveValidationById.set({});
    this.#selectedDriveFileIdsByRoot.set({});
  }

  #send(partnerId: number, description: string): void {
    if (this.submitting()) {
      return;
    }
    const items =
      this.kind() === 'url'
        ? { urls: this.addedUrls() }
        : {
            assetIds: this.#assetIds(),
            assetRelativePaths: uploadedAssetRelativePaths(this.#uploadItems()),
            driveFiles: this.#driveFiles(),
          };
    this.submitting.set(true);
    this.error.set(false);
    this.#service
      .addItems(partnerId, this.#effectiveLaunchId(), this.approvalId(), items, this.#email, description)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        this.submitting.set(false);
        if (response.error) {
          this.error.set(true);
          return;
        }
        this.addedUrls.set([]);
        this.urlInput.setValue('');
        this.close();
        this.added.emit();
      });
  }
}

function toAssetResult(response: BaseResponse<ApprovalAsset | null>): FzUploadResult {
  if (response.error || !response.data) {
    return { ok: false, errorMessage: response.error?.message };
  }
  return { ok: true, id: response.data.id };
}

function defaultSelectedDriveFileIds(validation?: DriveFileValidation): string[] | undefined {
  if (!validation || validation.acceptedFiles.length === 0) {
    return undefined;
  }
  return validation.acceptedFiles.map(file => file.driveFileId);
}

const DRIVE_VALIDATION_ERROR_KEYS: Readonly<Record<string, string>> = {
  DRIVE_FILE_NO_ACCESS: 'fzUpload.errors.driveLinkNoAccess',
  DRIVE_FILE_NOT_FOUND: 'fzUpload.errors.driveLinkNoAccess',
  DRIVE_FILE_TOO_LARGE: 'fzUpload.errors.driveLinkTooLarge',
  DRIVE_FOLDER_NOT_CONFIGURED: 'fzUpload.errors.driveFolderNotConfigured',
};

function driveValidationErrorKey(code: string | number | undefined): string {
  return (code !== undefined && DRIVE_VALIDATION_ERROR_KEYS[String(code)]) || 'fzUpload.errors.driveLinkNoAccess';
}

function hasDrivePreflightSummary(validation: DriveFileValidation): boolean {
  return validation.discoveredCount !== null && validation.acceptedCount !== null && validation.skippedCount !== null;
}
