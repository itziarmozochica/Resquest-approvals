import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnChanges,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { FileThumbnailComponent } from '@fz-original/app/modules/ir-approval/shared/components/file-thumbnail/file-thumbnail.component';
import { GooglePickerService } from '@fz-original/app/shared/services/google-picker/google-picker.service';
import { environment } from '@fz-original/environments/environment';
import { IgntButtonComponent, IgntDialogService } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { defer, Observable, of, Subject } from 'rxjs';
import { catchError, map, mergeMap, take } from 'rxjs/operators';

import { PendingUploadFile } from '../../models/directory-upload.model';
import { FILE_THUMBNAIL_WIDTH_PX, fileThumbnailKind } from '../../models/file-thumbnail.model';
import {
  FzDriveCommit,
  FzDriveSelection,
  FzFileCommit,
  FzPasteErrorKey,
  FzPreviewResolver,
  FzTrackedUpload,
  FzUploadItem,
  FzUploadResult,
  FzUrlParser,
} from '../../models/fz-upload.model';
import { LocalFilePreviewStore } from '../../services/local-file-preview-store.service';
import { PdfThumbnailService } from '../../services/pdf-thumbnail.service';
import { partitionUploadableFiles, readDroppedEntries, toPendingFromWebkitPath } from '../../utils/directory-upload.util';
import { isPatchApplied, trackedPatch } from '../../utils/fz-upload-tracking.util';

const PDF_PREVIEW_WIDTH_PX = FILE_THUMBNAIL_WIDTH_PX * 2;

/**
 * IR/Approval upload surface: local file dropzone + Google Drive picker + paste-URL, each toggleable.
 * The host supplies commit callbacks so the component stays service-agnostic. When a `driveCommit`
 * is provided, picker/paste selections are uploaded immediately; otherwise they are collected
 * client-side (the host reads `driveFileId` items from `itemsChange` and commits at submit time).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule, IgntButtonComponent, IgntInputFieldComponent, FileThumbnailComponent],
  selector: 'app-fz-upload',
  standalone: true,
  styleUrl: './fz-upload.component.scss',
  templateUrl: './fz-upload.component.html',
})
export class FzUploadComponent implements OnChanges {
  /** File commits in flight at once; each opens up to 3 part PUTs, so this bounds total requests. */
  static readonly uploadConcurrency = 3;

  readonly accept = input<string>('');
  readonly acceptedMimeTypes = input<string[] | null>(null);
  readonly disabled = input<boolean>(false);
  /** Download picker selections with the user's token and push them through fileCommit. */
  readonly downloadDriveSelections = input<boolean>(false);
  readonly driveCommit = input<FzDriveCommit | null>(null);
  readonly driveParentFolderId = input<string | null>(null);
  readonly dropHintKey = input<string>('fzUpload.dropHint');
  readonly enableComputer = input<boolean>(true);
  readonly enableDrive = input<boolean>(false);
  readonly enableDriveFolders = input<boolean>(false);
  readonly enablePaste = input<boolean>(false);
  /**
   * Expands directories dropped on the dropzone (FileSystem entries API), uploading each contained
   * file with its path relative to the dropped folder. System/metadata files are dropped silently;
   * files outside the accept filter are skipped and listed to the user. Dragging is the only
   * structured source — the browse dialog picks flat files.
   */
  readonly expandDirectories = input<boolean>(false);

  readonly fileCommit = input<FzFileCommit | null>(null);
  /** Human-readable accepted formats, quoted when files of a dropped folder are skipped. */
  readonly formatsLabel = input<string>('');
  readonly multiple = input<boolean>(true);
  /** Computer and Drive sources lock each other out once one of them holds an item. */
  readonly mutuallyExclusive = input<boolean>(false);
  readonly previewResolver = input<FzPreviewResolver | null>(null);
  /**
   * Ids the host now shows itself. Once seen, an id stays resolved; matching uploaded rows (folders:
   * every id) leave the list and keep their preview for the host row.
   */
  readonly resolvedIds = input<readonly string[]>([]);
  readonly trackedUploads = input<readonly FzTrackedUpload[]>([]);
  readonly urlParser = input<FzUrlParser | null>(null);

  readonly itemsChange = output<FzUploadItem[]>();
  readonly processingEnqueued = output<void>();
  readonly trackedUploadDismissed = output<string>();
  readonly uploadedIdsChange = output<string[]>();

  readonly items = signal<FzUploadItem[]>([]);
  readonly dragActive = signal<boolean>(false);
  readonly pickingFromDrive = signal<boolean>(false);
  readonly pickerError = signal<'pickerFailed' | null>(null);
  readonly pasteError = signal<FzPasteErrorKey | null>(null);
  readonly linkControl = new FormControl<string>('', { nonNullable: true });
  readonly linkValue = toSignal(this.linkControl.valueChanges, { initialValue: '' });
  readonly previewingUid = signal<string | null>(null);
  readonly skippedFiles = signal<string[]>([]);
  readonly noSupportedFiles = signal<boolean>(false);

  /** The Google Drive picker needs OAuth credentials; without them the picker can't open, so we
   * degrade gracefully (disable the button + show a notice) and keep the from-computer path usable. */
  driveConfigured = Boolean(environment.googlePickerClientId);

  readonly hasComputerItems = computed(() => this.items().some(item => item.source === 'computer'));
  readonly hasDriveItems = computed(() => this.items().some(item => item.source === 'drive'));
  readonly computerLocked = computed(() => this.disabled() || (this.mutuallyExclusive() && this.hasDriveItems()));
  readonly driveLocked = computed(() => this.disabled() || (this.mutuallyExclusive() && this.hasComputerItems()));
  readonly drivePickerDisabled = computed(() => this.pickingFromDrive() || this.driveLocked() || !this.driveConfigured);

  readonly #destroyRef = inject(DestroyRef);
  readonly #pdfThumbnails = inject(PdfThumbnailService);
  readonly #previews = inject(LocalFilePreviewStore);
  readonly #picker = inject(GooglePickerService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #translate = inject(TranslateService);

  /** Deferred so the commit (and its HTTP work) only starts when mergeMap grants it a slot. */
  readonly #fileCommitQueue$ = new Subject<{ uid: string; start: () => Observable<FzUploadResult> }>();

  readonly #seenResolvedIds = new Set<string>();
  readonly #handedOffIdByUid = new Map<string, string>();

  #destroyed = false;

  constructor() {
    this.#fileCommitQueue$
      .pipe(
        mergeMap(
          job =>
            defer(job.start).pipe(
              map(result => ({ result, uid: job.uid })),
              catchError(() => of<{ result: FzUploadResult; uid: string }>({ result: { ok: false }, uid: job.uid })),
            ),
          FzUploadComponent.uploadConcurrency,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ result, uid }) => this.#resolve(uid, result));

    toObservable(this.driveLocked)
      .pipe(takeUntilDestroyed())
      .subscribe(locked => (locked ? this.linkControl.disable({ emitEvent: false }) : this.linkControl.enable({ emitEvent: false })));

    this.#destroyRef.onDestroy(() => {
      this.#destroyed = true;
    });
  }

  addLink(raw?: string): void {
    if (this.driveLocked()) {
      return;
    }
    const value = (raw ?? this.linkControl.value).trim();
    if (!value) {
      return;
    }
    const parser = this.urlParser();
    const parsed = parser ? parser(value) : null;
    if (!parsed) {
      this.pasteError.set('invalidUrl');
      return;
    }
    if (this.items().some(item => item.driveFileId === parsed.driveFileId && item.status !== 'failed')) {
      this.pasteError.set('duplicate');
      return;
    }
    this.pasteError.set(null);
    this.linkControl.setValue('');
    this.#addDrive(parsed);
  }

  canPreview(entry: FzUploadItem): boolean {
    if (entry.status !== 'uploaded') {
      return false;
    }
    return Boolean(entry.url || (entry.id && this.previewResolver()));
  }

  enqueueFiles(files: File[]): void {
    this.#enqueue(toPendingFromWebkitPath(files));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['trackedUploads']) {
      this.#applyTrackedUploads();
    }
    if (changes['resolvedIds']) {
      this.#dropResolved();
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.computerLocked()) {
      this.dragActive.set(true);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const dataTransfer = event.dataTransfer;
    if (this.computerLocked() || !dataTransfer) {
      return;
    }
    if (!this.expandDirectories()) {
      this.#enqueue(toPendingFromWebkitPath(Array.from(dataTransfer.files)));
      return;
    }
    const plainFiles = Array.from(dataTransfer.files);
    readDroppedEntries(dataTransfer)
      .then(pending => this.#enqueueExpanded(pending.length > 0 ? pending : toPendingFromWebkitPath(plainFiles)))
      .catch(() => this.#enqueueExpanded(toPendingFromWebkitPath(plainFiles)));
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.skippedFiles.set([]);
    this.noSupportedFiles.set(false);
    this.enqueueFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  onLinkInput(): void {
    this.pasteError.set(null);
  }

  openFileDialog(): void {
    if (this.computerLocked()) {
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = this.multiple();
    input.accept = this.accept();
    input.addEventListener('change', event => this.onFilesSelected(event));
    input.click();
  }

  async openPicker(): Promise<void> {
    if (this.pickingFromDrive() || this.driveLocked() || !this.driveConfigured) {
      return;
    }
    this.pickingFromDrive.set(true);
    this.pickerError.set(null);
    try {
      const picked = await this.#picker.open({
        acceptedMimeTypes: this.acceptedMimeTypes() ?? undefined,
        parentFolderId: this.driveParentFolderId() ?? undefined,
        selectFolders: this.enableDriveFolders(),
      });
      if (picked) {
        const keepInDrive =
          picked.mimeType === 'application/vnd.google-apps.folder' || picked.mimeType === 'application/vnd.google-apps.spreadsheet';
        if (!keepInDrive && this.downloadDriveSelections() && this.fileCommit()) {
          await this.#downloadAndCommit(picked);
        } else {
          this.#addDrive({ driveFileId: picked.id, mimeType: picked.mimeType, name: picked.name, url: picked.url });
        }
      }
    } catch {
      this.pickerError.set('pickerFailed');
    } finally {
      this.pickingFromDrive.set(false);
    }
  }

  preview(entry: FzUploadItem): void {
    if (entry.url) {
      window.open(entry.url, '_blank', 'noopener');
      return;
    }
    const resolver = this.previewResolver();
    if (!resolver || !entry.id || this.previewingUid() !== null) {
      return;
    }
    this.previewingUid.set(entry.uid);
    resolver(entry)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => this.previewingUid.set(null),
        next: url => {
          this.previewingUid.set(null);
          window.open(url, '_blank', 'noopener');
        },
      });
  }

  remove(index: number): void {
    const trackingKey = this.items()[index]?.trackingKey;
    this.#setItems(this.items().filter((_, i) => i !== index));
    if (trackingKey) {
      this.trackedUploadDismissed.emit(trackingKey);
    }
  }

  #addDrive(selection: FzDriveSelection): void {
    this.#dropFailedDriveAttempts(selection.driveFileId);
    const uid = this.#uid();
    const base: FzUploadItem = {
      driveFileId: selection.driveFileId,
      mimeType: selection.mimeType,
      name: selection.name,
      size: 0,
      source: 'drive',
      status: 'uploading',
      uid,
      url: selection.url,
    };
    const commit = this.driveCommit();
    if (!commit) {
      this.#append({ ...base, status: 'uploaded' });
      return;
    }
    this.#append(base);
    this.#run(commit(selection), uid);
  }

  #append(item: FzUploadItem): void {
    this.items.set([...this.items(), item]);
    this.#emit();
  }

  #applyTrackedUploads(): void {
    let items = this.items();
    for (const upload of this.trackedUploads()) {
      const row = items.find(item => item.trackingKey === upload.key);
      if (!row) {
        if (upload.status !== 'uploaded') {
          items = [...items, this.#trackedRow(upload)];
        }
        continue;
      }
      if (row.status === 'processing' && upload.status === 'uploaded' && upload.ids.length === 0) {
        items = items.filter(item => item !== row);
        continue;
      }
      const patch = trackedPatch(upload);
      if (row.status === 'processing' && !isPatchApplied(row, patch)) {
        items = items.map(item => (item === row ? { ...item, ...patch } : item));
      }
    }
    if (items === this.items()) {
      return;
    }
    this.items.set(items);
    this.#emit();
    this.#dropResolved();
  }

  async #downloadAndCommit(picked: { id: string; mimeType: string; name: string; url: string }): Promise<void> {
    try {
      const file = await this.#picker.downloadPickedFile(picked);
      this.enqueueFiles([file]);
    } catch {
      if (this.driveCommit()) {
        this.#addDrive({ driveFileId: picked.id, mimeType: picked.mimeType, name: picked.name, url: picked.url });
        return;
      }
      this.#showAttachErrorModalForKey('fzUpload.errors.driveDownloadFailed');
    }
  }

  #dropFailedDriveAttempts(driveFileId: string): void {
    const dropped = this.items().filter(item => item.driveFileId === driveFileId && item.status === 'failed');
    if (dropped.length === 0) {
      return;
    }
    this.#setItems(this.items().filter(item => !dropped.includes(item)));
    dropped.forEach(item => item.trackingKey && this.trackedUploadDismissed.emit(item.trackingKey));
  }

  #dropResolved(): void {
    this.resolvedIds().forEach(id => this.#seenResolvedIds.add(id));
    if (this.#seenResolvedIds.size === 0) {
      return;
    }
    const dropped = this.items().filter(item => isResolvedBy(item, this.#seenResolvedIds));
    if (dropped.length === 0) {
      return;
    }
    dropped.forEach(item => item.id && this.#handedOffIdByUid.set(item.uid, item.id));
    this.items.set(this.items().filter(item => !dropped.includes(item)));
    this.#emit();
  }

  #emit(): void {
    const items = this.items();
    this.itemsChange.emit(items);
    this.uploadedIdsChange.emit(items.filter(item => item.status === 'uploaded' && item.id).map(item => item.id as string));
  }

  #enqueue(pending: PendingUploadFile[]): void {
    if (this.computerLocked()) {
      return;
    }
    const commit = this.fileCommit();
    for (const { file, relativePath } of pending) {
      const uid = this.#uid();
      this.#append({
        localPreviewUrl: this.#localPreviewUrl(file),
        mimeType: file.type || undefined,
        name: file.name,
        relativePath: relativePath || undefined,
        size: file.size,
        source: 'computer',
        status: 'uploading',
        uid,
      });
      this.#renderPdfPreview(uid, file);
      if (!commit) {
        continue;
      }
      this.#fileCommitQueue$.next({ uid, start: () => commit(file, relativePath) });
    }
  }

  #enqueueExpanded(pending: PendingUploadFile[]): void {
    const { accepted, unsupported } = partitionUploadableFiles(pending, [...this.accept().split(','), ...(this.acceptedMimeTypes() ?? [])]);
    this.skippedFiles.set(unsupported.map(({ file, relativePath }) => relativePath || file.name));
    this.noSupportedFiles.set(accepted.length === 0);
    this.#enqueue(accepted);
  }

  /**
   * A commit that reports no reason tells us nothing about Drive access — it is a thrown request or a
   * host-side rejection. Only the hosts' validation responses know that the integration account cannot
   * reach the file, and they say so through `errorMessage`, so the reasonless case stays generic.
   */
  #fail(uid: string, errorMessage?: string): void {
    this.#patch(uid, { errorKey: 'uploadFailed', status: 'failed' });
    if (errorMessage) {
      this.#showAttachErrorModal(errorMessage.includes(' ') ? errorMessage : this.#translate.instant(errorMessage));
      return;
    }
    if (this.items().find(item => item.uid === uid)?.source === 'drive') {
      this.#showAttachErrorModalForKey('fzUpload.errors.uploadFailed');
    }
  }

  #localPreviewUrl(file: File): string | undefined {
    return this.#previews.createFor(file);
  }

  #patch(uid: string, patch: Partial<FzUploadItem>): void {
    this.items.set(this.items().map(item => (item.uid === uid ? { ...item, ...patch } : item)));
    this.#emit();
  }

  #publishPreview(uid: string, url?: string): void {
    const item = this.items().find(candidate => candidate.uid === uid);
    const id = item?.id ?? this.#handedOffIdByUid.get(uid);
    if (id) {
      this.#previews.register(id, url ?? item?.localPreviewUrl);
    }
  }

  #renderPdfPreview(uid: string, file: File): void {
    if (fileThumbnailKind(file.type, file.name) !== 'pdf') {
      return;
    }
    this.#pdfThumbnails.render(file, PDF_PREVIEW_WIDTH_PX).then(dataUrl => {
      if (!dataUrl) {
        return;
      }
      if (!this.#destroyed) {
        this.#patch(uid, { localPreviewUrl: dataUrl });
      }
      this.#publishPreview(uid, dataUrl);
    });
  }

  #resolve(uid: string, result: FzUploadResult): void {
    if (!result.ok) {
      this.#fail(uid, result.errorMessage);
      return;
    }
    if (result.processing) {
      this.#patch(uid, { status: 'processing', trackingKey: result.trackingKey });
      this.processingEnqueued.emit();
      return;
    }
    this.#patch(uid, { id: result.id, ids: result.ids, status: 'uploaded' });
    this.#publishPreview(uid);
    this.#dropResolved();
  }

  #run(source: Observable<FzUploadResult>, uid: string): void {
    source.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: () => this.#fail(uid),
      next: result => this.#resolve(uid, result),
    });
  }

  #setItems(next: FzUploadItem[]): void {
    const keptUids = new Set(next.map(item => item.uid));
    this.items()
      .filter(item => !keptUids.has(item.uid))
      .forEach(item => (item.id ? this.#previews.release(item.id) : this.#previews.revoke(item.localPreviewUrl)));
    this.items.set(next);
    this.#emit();
  }

  #showAttachErrorModal(message: string): void {
    this.#dialogService.openMessageModal(this.#translate.instant('fzUpload.errors.driveAccessTitle'), message);
  }

  #showAttachErrorModalForKey(messageKey: string): void {
    this.#showAttachErrorModal(this.#translate.instant(messageKey));
  }

  #trackedRow(upload: FzTrackedUpload): FzUploadItem {
    return {
      driveFileId: upload.driveFileId,
      name: upload.name,
      size: 0,
      source: 'drive',
      status: 'processing',
      trackingKey: upload.key,
      uid: this.#uid(),
      ...trackedPatch(upload),
    };
  }

  #uid(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function isResolvedBy(item: FzUploadItem, resolved: ReadonlySet<string>): boolean {
  const ids = item.ids ?? (item.id ? [item.id] : []);
  return item.status === 'uploaded' && ids.length > 0 && ids.every(id => resolved.has(id));
}
