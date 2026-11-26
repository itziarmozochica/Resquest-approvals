import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IgntTagComponent, TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

export type LaunchRecordMetric = { mode: 'progress'; completed: number; total: number } | { mode: 'count'; count: number };

@Component({
  selector: 'app-launch-record-row',
  templateUrl: './launch-record-row.component.html',
  styleUrls: ['./launch-record-row.component.scss'],
  imports: [DatePipe, RouterLink, TranslateModule, IgntTagComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchRecordRowComponent {
  readonly name = input.required<string>();
  readonly subtitleKey = input<string>('');
  readonly statusLabelKey = input.required<string>();
  readonly statusSentiment = input.required<TagSentiment>();
  /** Lowercase status slug, surfaced as `data-status` so styles can target a specific status. */
  readonly statusKey = input<string>('');
  readonly createdAt = input.required<Date>();
  readonly metric = input<LaunchRecordMetric | null>(null);
  readonly routerLink = input.required<unknown[]>();

  readonly progressPercent = computed<number>(() => {
    const metric = this.metric();
    if (!metric || metric.mode !== 'progress' || metric.total <= 0) {
      return 0;
    }
    return Math.round((metric.completed / metric.total) * 100);
  });
}
