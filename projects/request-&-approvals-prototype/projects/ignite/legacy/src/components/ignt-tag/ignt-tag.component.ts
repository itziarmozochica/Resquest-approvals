import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Input, input } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { IGNT_TAG_CONTEXT, type TagSentiment } from '@ignite/common';

// Re-exported so existing consumers importing `TagSentiment` from this legacy
// path keep working. The canonical home is `@ignite/common`.
export type { TagSentiment };

export type TagVariant = 'solid' | 'outline';

@Component({
  selector: 'ignt-tag',
  templateUrl: './ignt-tag.component.html',
  styleUrls: ['./ignt-tag.component.scss'],
  standalone: true,
  imports: [IconsModule, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntTagComponent {
  readonly baseClass = 'tag';
  @Input() bullet?: IconProp;
  @Input() endIcon?: IconProp;
  @Input() heightAuto = false;
  readonly sentiment = input<TagSentiment>();
  @Input() startIcon?: IconProp;
  @Input() variant: TagVariant = 'solid';

  readonly #context = inject(IGNT_TAG_CONTEXT, { optional: true });

  protected readonly effectiveSentiment = computed<TagSentiment>(() => this.sentiment() ?? this.#context?.sentiment?.() ?? 'positive');
}
