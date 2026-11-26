import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';

import { IgntIconComponent, IgntIconName } from '@ignite/icon';

import { TagColor } from '../../enums/tag-color.enum';
import { ChipTag } from '../../models/tag.model';
import { tagColorOrNeutral } from '../../utils/tag-color.util';
import { isTagIcon, tagIconVariant } from '../../utils/tag-icon.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'app-tag-chip',
  standalone: true,
  styleUrl: './tag-chip.component.scss',
  templateUrl: './tag-chip.component.html',
})
export class TagChipComponent {
  readonly tag = input.required<ChipTag>();

  protected readonly iconVariant = tagIconVariant;

  protected readonly icon: Signal<IgntIconName | null> = computed(() => {
    const icon = this.tag().icon;

    return isTagIcon(icon) ? icon : null;
  });

  protected readonly color: Signal<TagColor> = computed(() => tagColorOrNeutral(this.tag().color));
}
