import { CdkMenuGroup } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-label]': 'ariaLabel() || null',
    class: 'ignt-menu-radio-group',
  },
  hostDirectives: [CdkMenuGroup],
  selector: 'ignt-menu-radio-group',
  styleUrl: './menu-radio-group.component.scss',
  templateUrl: './menu-radio-group.component.html',
})
export class IgntMenuRadioGroupComponent {
  /* Accessible name of the group, read by assistive technology */
  readonly ariaLabel = input<string>();
}
