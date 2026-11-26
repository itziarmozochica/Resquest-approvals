import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, input, output } from '@angular/core';

import { FileThumbnailComponent } from '@fz-original/app/modules/ir-approval/shared/components/file-thumbnail/file-thumbnail.component';
import { LocalFilePreviewStore } from '@fz-original/app/modules/ir-approval/shared/services/local-file-preview-store.service';
import { IgntButtonComponent, IgntButtonIcon } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { canViewFileAnswer } from '../../models/file-answer-view.util';
import { IrFileTreeFileNode, IrFileTreeFolderNode } from '../../models/information-request-file-tree.model';
import { fileAnswerSyncStatusKey, InformationRequestFileAnswer } from '../../models/information-request-question.model';
import { IrFileSyncTrackerService } from '../../services/ir-file-sync-tracker.service';

/**
 * One level of the file tree: folder toggles plus file rows, recursing into itself for expanded
 * subfolders. Nodes arrive precomputed (`IrFileTreeFolderNode`/`IrFileTreeFileNode`); interaction
 * bubbles up through the outputs so the tree root owns all state.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntButtonComponent, FileThumbnailComponent, forwardRef(() => IrFileTreeBranchComponent)],
  selector: 'app-ir-file-tree-branch',
  standalone: true,
  styleUrls: ['./ir-file-tree-branch.component.scss'],
  templateUrl: './ir-file-tree-branch.component.html',
})
export class IrFileTreeBranchComponent {
  readonly disabled = input<boolean>(false);
  readonly files = input<IrFileTreeFileNode[]>([]);
  readonly folders = input<IrFileTreeFolderNode[]>([]);
  /** The top level renders the `tree` role; nested levels render `group`. */
  readonly root = input<boolean>(false);
  readonly testIdPrefix = input<string>('');
  readonly viewingFileKey = input<string | null>(null);

  readonly remove = output<InformationRequestFileAnswer>();
  readonly toggleFolder = output<string>();
  readonly view = output<InformationRequestFileAnswer>();

  protected readonly folderIcon: IgntButtonIcon = { name: 'folder', variant: 'light' };
  protected readonly viewableFileKeys = computed<ReadonlySet<string>>(
    () =>
      new Set<string>(
        this.files()
          .filter((node: IrFileTreeFileNode) => canViewFileAnswer(node.file))
          .map((node: IrFileTreeFileNode) => node.key),
      ),
  );

  readonly #previews = inject(LocalFilePreviewStore);
  readonly #fileSyncTracker = inject(IrFileSyncTrackerService, { optional: true });

  protected fileSyncStatusKey(file: InformationRequestFileAnswer): string {
    return fileAnswerSyncStatusKey(file, {
      fromDriveLink: this.#fileSyncTracker?.isDriveLinkFile(file) ?? false,
      stalled: this.#fileSyncTracker?.isFileStalled(file) ?? false,
    });
  }

  protected localPreview(node: IrFileTreeFileNode): string | undefined {
    return this.#previews.get(node.key);
  }

  protected requestExpanded(folder: IrFileTreeFolderNode, expanded: boolean): void {
    if (folder.expanded !== expanded) {
      this.toggleFolder.emit(folder.key);
    }
  }
}
