import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';

import { IgntTooltipDirective } from '@ignite/common';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

import { AssignedTag } from '../../models/tag-assignment.model';
import { TagChipComponent } from '../tag-chip/tag-chip.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTagComponent, IgntTooltipDirective, TagChipComponent],
  selector: 'app-tag-chip-list',
  standalone: true,
  styleUrl: './tag-chip-list.component.scss',
  templateUrl: './tag-chip-list.component.html',
})
export class TagChipListComponent {
  static readonly visibleLimit = 2;

  readonly tags = input.required<readonly AssignedTag[]>();

  protected readonly visibleTags: Signal<readonly AssignedTag[]> = computed(() => this.tags().slice(0, TagChipListComponent.visibleLimit));
  protected readonly hiddenTags: Signal<readonly AssignedTag[]> = computed(() => this.tags().slice(TagChipListComponent.visibleLimit));
  protected readonly hiddenNames: Signal<string> = computed(() =>
    this.hiddenTags()
      .map(tag => tag.name)
      .join(', '),
  );
}
