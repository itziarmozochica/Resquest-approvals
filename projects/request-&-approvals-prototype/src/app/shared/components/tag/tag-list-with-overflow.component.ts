import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';

import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import { TagListItem } from './tag-list-with-overflow.model';

const DEFAULT_MAX_VISIBLE = 3;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTagComponent, TranslateModule],
  selector: 'app-tag-list-with-overflow',
  standalone: true,
  styleUrl: './tag-list-with-overflow.component.scss',
  templateUrl: './tag-list-with-overflow.component.html',
})
export class TagListWithOverflowComponent {
  readonly tags = input.required<readonly TagListItem[]>();
  readonly maxVisible = input<number>(DEFAULT_MAX_VISIBLE);

  protected readonly visibleTags: Signal<readonly TagListItem[]> = computed(() => this.tags().slice(0, this.maxVisible()));
  protected readonly overflowCount: Signal<number> = computed(() => Math.max(0, this.tags().length - this.maxVisible()));
}
