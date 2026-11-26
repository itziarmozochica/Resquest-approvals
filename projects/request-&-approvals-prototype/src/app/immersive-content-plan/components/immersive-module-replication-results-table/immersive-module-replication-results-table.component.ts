import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntTableColumnComponent, IgntTableColumnTemplateDirective, IgntTableComponent } from '@ignite/table';
import { TranslateModule } from '@ngx-translate/core';

import type { GroupedReplicationOutcome, ReplicationResultItem } from '../../models/immersive-module-replication.model';
import { formatReplicationErrorDetail } from '../../utils/immersive-module-replication-error-detail.util';
import { GROUP_LABEL_KEYS } from './immersive-module-replication-results-table.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntTableComponent, IgntTableColumnComponent, IgntTableColumnTemplateDirective],
  selector: 'app-immersive-module-replication-results-table',
  styleUrl: './immersive-module-replication-results-table.component.scss',
  templateUrl: './immersive-module-replication-results-table.component.html',
})
export class ImmersiveModuleReplicationResultsTableComponent {
  readonly groups = input.required<GroupedReplicationOutcome[]>();

  // A failed item explains itself in one of three shapes: a translation gap (`locale`, `key`), a
  // schema violation (`path`, `message`), or a free-text `detail`. Every one is shown as it came.
  protected detailOf(item: ReplicationResultItem): string {
    const details = (item.errors ?? []).map(formatReplicationErrorDetail);
    if (item.detail !== undefined && item.detail !== '') {
      details.push(item.detail);
    }
    return details.length > 0 ? details.join(', ') : '—';
  }

  protected groupLabelKey(group: GroupedReplicationOutcome['group']): string {
    return GROUP_LABEL_KEYS[group];
  }
}
