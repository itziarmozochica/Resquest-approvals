import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { IrFileTreeView } from '../../models/information-request-file-tree.model';
import { buildInformationRequestFileTree, toIrFileTreeView } from '../../models/information-request-file-tree.util';
import { InformationRequestFileAnswer } from '../../models/information-request-question.model';
import { IrFileTreeBranchComponent } from '../ir-file-tree-branch/ir-file-tree-branch.component';

/**
 * Renders a question's file answers as a collapsible folder tree grouped by each file's
 * `folderPath`. Files with no path stay at the root, so a flat list renders exactly as before.
 * Presentational: the host owns the file answers and reacts to the preview/view/remove outputs.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IrFileTreeBranchComponent],
  selector: 'app-ir-file-tree',
  standalone: true,
  styleUrls: ['./ir-file-tree.component.scss'],
  templateUrl: './ir-file-tree.component.html',
})
export class IrFileTreeComponent {
  readonly disabled = input<boolean>(false);
  readonly files = input<InformationRequestFileAnswer[]>([]);
  readonly testIdPrefix = input<string>('');
  readonly viewingFileKey = input<string | null>(null);

  readonly remove = output<InformationRequestFileAnswer>();
  readonly view = output<InformationRequestFileAnswer>();

  readonly #collapsed = signal<ReadonlySet<string>>(new Set<string>());

  protected readonly tree = computed<IrFileTreeView>(() =>
    toIrFileTreeView(buildInformationRequestFileTree(this.files()), this.#collapsed()),
  );

  protected toggle(folderKey: string): void {
    const next = new Set(this.#collapsed());
    if (next.has(folderKey)) {
      next.delete(folderKey);
    } else {
      next.add(folderKey);
    }
    this.#collapsed.set(next);
  }
}
