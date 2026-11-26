import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { RelativeTimePipe } from '@fz-original/app/modules/reports/fz-assistant-view/pipes/relative-time.pipe';
import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';
import { hasProjectScope } from '@fz-original/app/shared/utils/project-scope.util';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ZiflowFolder, ZiflowFolderSelection } from '../../models/ziflow-folder.model';
import { ZiflowFoldersService } from '../../services/ziflow-folders.service';

@Component({
  selector: 'app-approval-ziflow-folder-picker',
  templateUrl: './approval-ziflow-folder-picker.component.html',
  styleUrls: ['./approval-ziflow-folder-picker.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntRadioGroupComponent,
    IgntRadioComponent,
  ],
  providers: [RelativeTimePipe],
})
export class ApprovalZiflowFolderPickerComponent implements OnInit {
  static readonly genericPasteError = 'generic';

  readonly partnerId = input<number | null>(null);
  readonly projectId = input<string | null>(null);
  readonly selectedFolder = input<string | null>(null);

  readonly selectionChange = output<ZiflowFolderSelection>();

  readonly #service = inject(ZiflowFoldersService);
  readonly #translate = inject(TranslateService);
  readonly #relativeTime = inject(RelativeTimePipe);
  readonly #destroyRef = inject(DestroyRef);

  readonly #suggestedFolders = signal<ZiflowFolder[]>([]);
  readonly #knownFolders = signal<ZiflowFolder[]>([]);
  readonly #selectedFolderId = signal<string | null>(null);
  readonly #discoveryFailed = signal(false);
  readonly #restoreFailed = signal(false);
  readonly #loading = signal(false);
  readonly #restoring = signal(false);
  readonly #resolving = signal(false);
  readonly #pasteError = signal<string | null>(null);

  readonly loading = computed(() => this.#loading() || this.#restoring());
  readonly resolving = this.#resolving.asReadonly();
  readonly pasteError = this.#pasteError.asReadonly();

  readonly folderControl = new FormControl<string | null>(null);
  readonly linkControl = new FormControl<string>('', { nonNullable: true });

  readonly #resetNonce = signal(0);
  readonly resetNonce = this.#resetNonce.asReadonly();

  readonly hasLaunch = computed(() => hasProjectScope(this.projectId()));
  readonly hasSelection = computed(() => this.#selectedFolderId() !== null);

  readonly folders = computed<ZiflowFolder[]>(() => {
    const suggested = this.#suggestedFolders();
    const known = this.#knownFolders().filter(folder => !suggested.some(existing => existing.folderId === folder.folderId));
    return [...known, ...suggested];
  });

  readonly loadError = computed(() => this.#discoveryFailed() && this.folders().length === 0);

  readonly restoreError = computed(() => {
    const selectedId = this.#selectedFolderId();
    return this.#restoreFailed() && selectedId !== null && !this.folders().some(folder => folder.folderId === selectedId);
  });

  #launchKey: string | null = null;
  #selectionNonce = 0;

  constructor() {
    toObservable(computed(() => ({ partnerId: this.partnerId(), projectId: this.projectId() })))
      .pipe(
        switchMap(({ partnerId, projectId }) => {
          const launchKey = `${partnerId}|${projectId}`;
          if (this.#launchKey !== null && this.#launchKey !== launchKey) {
            this.#discardSelection();
            this.#knownFolders.set([]);
            this.#restoreFailed.set(false);
          }
          this.#launchKey = launchKey;
          this.#resolving.set(false);
          this.#pasteError.set(null);
          this.#discoveryFailed.set(false);
          if (partnerId === null || !projectId) {
            this.#loading.set(false);
            this.#suggestedFolders.set([]);
            return EMPTY;
          }
          this.#loading.set(true);
          return this.#service.get(partnerId, projectId);
        }),
        takeUntilDestroyed(),
      )
      .subscribe(response => {
        const failed = !!response.error || !response.data;
        this.#loading.set(false);
        this.#discoveryFailed.set(failed);
        this.#suggestedFolders.set(failed ? [] : (response.data ?? []));
      });

    this.folderControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(folderId => {
      this.#selectedFolderId.set(folderId);
      if (folderId) {
        this.#selectionNonce += 1;
        this.linkControl.setValue('', { emitEvent: false });
        this.#pasteError.set(null);
        const thumbnailUrl = this.folders().find(folder => folder.folderId === folderId)?.thumbnailUrl ?? null;
        this.selectionChange.emit({ folder: folderId, thumbnailUrl });
      }
    });
  }

  ngOnInit(): void {
    const restored = this.selectedFolder();
    if (restored) {
      this.#selectedFolderId.set(restored);
      this.folderControl.setValue(restored, { emitEvent: false });
      this.#restoreSelectedFolder(restored);
    }
  }

  #restoreSelectedFolder(folderId: string): void {
    const partnerId = this.partnerId();
    if (partnerId === null) {
      return;
    }
    this.#restoring.set(true);
    this.#service
      .resolveFolder(partnerId, this.projectId(), folderId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        this.#restoring.set(false);
        if (this.#selectedFolderId() !== folderId) {
          return;
        }
        if (!response.data) {
          this.#restoreFailed.set(true);
          return;
        }
        this.#rememberFolder(response.data);
      });
  }

  #rememberFolder(folder: ZiflowFolder): void {
    this.#knownFolders.update(folders =>
      folders.some(existing => existing.folderId === folder.folderId) ? folders : [folder, ...folders],
    );
  }

  loadPastedLink(): void {
    const link = this.linkControl.value.trim();
    const partnerId = this.partnerId();
    const projectId = this.projectId();
    if (!link || partnerId === null || this.#resolving() || this.#loading()) {
      return;
    }
    this.#resolving.set(true);
    this.#pasteError.set(null);
    const selectionNonce = this.#selectionNonce;
    this.#service
      .resolveFolder(partnerId, projectId, link)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        this.#resolving.set(false);
        if (this.partnerId() !== partnerId || this.projectId() !== projectId || this.#selectionNonce !== selectionNonce) {
          return;
        }
        if (response.error || !response.data) {
          this.#pasteError.set(this.#pasteErrorFor(response.error));
          return;
        }
        const folder = response.data;
        this.#rememberFolder(folder);
        this.linkControl.setValue('', { emitEvent: false });
        this.folderControl.setValue(folder.folderId);
      });
  }

  openFolder(folder: ZiflowFolder): void {
    if (folder.folderUrl) {
      window.open(folder.folderUrl, '_blank', 'noopener,noreferrer');
    }
  }

  clearSelection(): void {
    this.#selectionNonce += 1;
    this.#deselectFolder();
    this.linkControl.setValue('', { emitEvent: false });
    this.#pasteError.set(null);
    this.selectionChange.emit({ folder: null, thumbnailUrl: null });
  }

  #deselectFolder(): void {
    this.folderControl.setValue(null, { emitEvent: false });
    this.#selectedFolderId.set(null);
    this.#resetNonce.update(nonce => nonce + 1);
  }

  folderDescription(folder: ZiflowFolder): string {
    const parts: string[] = [];
    parts.push(this.#translate.instant('approvals.new.upload.ziflowProofCount', { count: folder.proofCount }));
    if (folder.latestProofCreatedAt) {
      const ago = this.#relativeTime.transform(new Date(folder.latestProofCreatedAt));
      if (ago) {
        parts.push(this.#translate.instant('approvals.new.upload.ziflowCreatedAgo', { ago }));
      }
    }
    return parts.join(' · ');
  }

  #discardSelection(): void {
    if (this.folderControl.value === null && this.linkControl.value === '') {
      return;
    }
    this.clearSelection();
  }

  #pasteErrorFor(error: BaseErrorResponse | null | undefined): string {
    return typeof error?.code === 'string' && error.code.length > 0 ? error.code : ApprovalZiflowFolderPickerComponent.genericPasteError;
  }
}
