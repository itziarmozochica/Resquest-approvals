import { NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, TemplateRef } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

import { IgntDividerComponent } from '../ignt-divider/ignt-divider.component';
import type { WrapperCardVariant } from '../ignt-wrapper-card/ignt-wrapper-card.component';
import { IgntWrapperCardComponent } from '../ignt-wrapper-card/ignt-wrapper-card.component';

@Component({
  selector: 'ignt-list-item',
  templateUrl: './ignt-list-item.component.html',
  styleUrls: ['./ignt-list-item.component.scss'],
  standalone: true,
  imports: [IconsModule, IgntWrapperCardComponent, IgntDividerComponent, NgIf, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IgntListItemComponent {
  get itemType(): WrapperCardVariant {
    if (this.selected && this.type === 'default') {
      return 'primary';
    }
    return (this.type as WrapperCardVariant) || 'default';
  }
  @Input() backgroundColor?: string;
  @Input() clickable = false;
  @Input() description = '';
  @Input() divider = false;
  @Input() id = '';
  @Input() leadingIcon: IconProp | null = null;
  @Input() leadingIconTemplate: TemplateRef<unknown> | null = null;
  @Input() selected = false;
  @Input() title = '';

  @Input() type: WrapperCardVariant = 'default';
}
