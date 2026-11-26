import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { FilePreviewDialogComponent } from '@fz-original/app/modules/ir-approval/shared/components/file-preview-dialog/file-preview-dialog.component';
import { FileThumbnailComponent } from '@fz-original/app/modules/ir-approval/shared/components/file-thumbnail/file-thumbnail.component';
import { PreviewFile } from '@fz-original/app/modules/ir-approval/shared/models/file-preview-dialog.model';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';

import { ApprovalDriveAcceptedFile } from '../../models/approval-drive-file.model';

interface FolderNode {
  key: string;
  name: string;
  folders: Map<string, FolderNode>;
  files: ApprovalDriveAcceptedFile[];
}

interface TreeRow {
  key: string;
  name: string;
  depth: number;
  kind: 'folder' | 'file';
  driveFileId?: string;
  mimeType?: string;
  descendantFileIds: string[];
  checked: boolean;
  indeterminate: boolean;
  collapsed?: boolean;
}

@Component({
  selector: 'app-approval-drive-file-tree',
  templateUrl: './approval-drive-file-tree.component.html',
  styleUrls: ['./approval-drive-file-tree.component.scss'],
  imports: [CommonModule, TranslateModule, IgntButtonComponent, IgntCheckboxComponent, FilePreviewDialogComponent, FileThumbnailComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalDriveFileTreeComponent {
  readonly files = input<ApprovalDriveAcceptedFile[]>([]);
  readonly rootUrl = input<string | null>(null);
  readonly selectedDriveFileIds = input<string[] | undefined>(undefined);
  readonly selectionChange = output<string[]>();
  readonly previewFile = signal<PreviewFile | null>(null);

  readonly totalFileCount = computed(() => this.files().length);
  readonly selectedFileCount = computed(() => this.#selectedIds().size);
  readonly hasFolders = computed(() => this.#folderKeys().length > 0);
  readonly allCollapsed = computed(() => this.#folderKeys().every(key => this.#effectiveCollapsedFolderKeys().has(key)));
  readonly rows = computed(() => buildTreeRows(this.files(), this.#selectedIds(), this.#effectiveCollapsedFolderKeys()));

  readonly #collapsedFolderKeys = signal<ReadonlySet<string>>(new Set<string>());

  readonly #selectedIds = computed(() => {
    const files = this.files();
    const selected = this.selectedDriveFileIds();
    return new Set(selected ?? files.map(file => file.driveFileId));
  });
  readonly #folderKeys = computed(() => collectFolderKeys(buildTree(this.files())));
  readonly #effectiveCollapsedFolderKeys = computed(() => {
    const folderKeys = new Set(this.#folderKeys());
    return new Set([...this.#collapsedFolderKeys()].filter(key => folderKeys.has(key)));
  });

  onCheckboxChange(row: TreeRow, checked: boolean): void {
    const next = new Set(this.#selectedIds());
    if (row.kind === 'folder') {
      if (checked) {
        row.descendantFileIds.forEach(fileId => next.add(fileId));
      } else {
        row.descendantFileIds.forEach(fileId => next.delete(fileId));
      }
    } else if (row.driveFileId) {
      if (checked) {
        next.add(row.driveFileId);
      } else {
        next.delete(row.driveFileId);
      }
    }
    this.selectionChange.emit(this.#orderedSelection(next));
  }

  selectAll(): void {
    this.selectionChange.emit(this.files().map(file => file.driveFileId));
  }

  clearSelection(): void {
    this.selectionChange.emit([]);
  }

  collapseAll(): void {
    this.#collapsedFolderKeys.set(new Set(this.#folderKeys()));
  }

  expandAll(): void {
    this.#collapsedFolderKeys.set(new Set());
  }

  toggleFolder(row: TreeRow): void {
    if (row.kind !== 'folder') {
      return;
    }
    this.#collapsedFolderKeys.update(current => {
      const next = new Set(current);
      if (next.has(row.key)) {
        next.delete(row.key);
      } else {
        next.add(row.key);
      }
      return next;
    });
  }

  openPreview(row: TreeRow): void {
    if (row.kind !== 'file' || !row.driveFileId) {
      return;
    }
    this.previewFile.set({
      driveFileId: row.driveFileId,
      webViewLink: `https://drive.google.com/file/d/${row.driveFileId}/view`,
      originalName: row.name,
      mimeType: row.mimeType ?? '',
    });
  }

  closePreview(): void {
    this.previewFile.set(null);
  }

  openInDrive(url: string | null): void {
    if (!url) {
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  fileTypeLabel(row: TreeRow): string {
    if (row.kind !== 'file') {
      return '';
    }
    const extension = row.name.split('.').pop()?.trim();
    if (extension && extension !== row.name) {
      return extension.toUpperCase();
    }
    if (row.mimeType?.startsWith('image/')) {
      return 'IMAGE';
    }
    if (row.mimeType?.startsWith('video/')) {
      return 'VIDEO';
    }
    return row.mimeType || 'FILE';
  }

  #orderedSelection(selectedIds: Set<string>): string[] {
    return this.files()
      .map(file => file.driveFileId)
      .filter(fileId => selectedIds.has(fileId));
  }
}

function buildTreeRows(files: ApprovalDriveAcceptedFile[], selectedIds: Set<string>, collapsedFolderKeys: ReadonlySet<string>): TreeRow[] {
  return flattenFolder(buildTree(files), selectedIds, collapsedFolderKeys, 0);
}

function buildTree(files: ApprovalDriveAcceptedFile[]): FolderNode {
  const root: FolderNode = { key: 'root', name: '', folders: new Map(), files: [] };

  for (const file of [...files].sort(compareDriveFiles)) {
    let current = root;
    const segments = file.path ?? [];
    segments.forEach((segment, index) => {
      const segmentKey = segments.slice(0, index + 1).join('/');
      if (!current.folders.has(segment)) {
        current.folders.set(segment, {
          key: segmentKey,
          name: segment,
          folders: new Map(),
          files: [],
        });
      }
      current = current.folders.get(segment)!;
    });
    current.files.push(file);
  }

  return root;
}

function flattenFolder(folder: FolderNode, selectedIds: Set<string>, collapsedFolderKeys: ReadonlySet<string>, depth: number): TreeRow[] {
  const rows: TreeRow[] = [];
  const childFolders = [...folder.folders.values()].sort((left, right) => left.name.localeCompare(right.name));

  for (const childFolder of childFolders) {
    const descendantFileIds = collectFolderFileIds(childFolder);
    const selectedCount = descendantFileIds.filter(fileId => selectedIds.has(fileId)).length;
    const collapsed = collapsedFolderKeys.has(`folder:${childFolder.key}`);
    rows.push({
      key: `folder:${childFolder.key}`,
      name: childFolder.name,
      depth,
      kind: 'folder',
      descendantFileIds,
      checked: selectedCount === descendantFileIds.length && descendantFileIds.length > 0,
      indeterminate: selectedCount > 0 && selectedCount < descendantFileIds.length,
      collapsed,
    });
    if (!collapsed) {
      rows.push(...flattenFolder(childFolder, selectedIds, collapsedFolderKeys, depth + 1));
    }
  }

  for (const file of [...folder.files].sort(compareDriveFiles)) {
    rows.push({
      key: `file:${file.driveFileId}`,
      name: file.name,
      depth,
      kind: 'file',
      driveFileId: file.driveFileId,
      mimeType: file.mimeType,
      descendantFileIds: [file.driveFileId],
      checked: selectedIds.has(file.driveFileId),
      indeterminate: false,
    });
  }

  return rows;
}

function collectFolderFileIds(folder: FolderNode): string[] {
  return [
    ...[...folder.folders.values()].flatMap(childFolder => collectFolderFileIds(childFolder)),
    ...folder.files.map(file => file.driveFileId),
  ];
}

function collectFolderKeys(folder: FolderNode): string[] {
  return [...folder.folders.values()].flatMap(childFolder => [`folder:${childFolder.key}`, ...collectFolderKeys(childFolder)]);
}

function compareDriveFiles(left: ApprovalDriveAcceptedFile, right: ApprovalDriveAcceptedFile): number {
  const leftPath = [...left.path, left.name].join('/');
  const rightPath = [...right.path, right.name].join('/');
  return leftPath.localeCompare(rightPath);
}
