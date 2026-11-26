import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

/**
 * @deprecated Use `IgntSwitchComponent` from `@ignite/common` instead.
 */
@Component({
  selector: 'ignt-toggle',
  templateUrl: './ignt-toggle.component.html',
  styleUrls: ['./ignt-toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IconsModule],
})
export class IgntToggleComponent {
  @Input() id = '';
  @Input() checked = false;
  @Input() disabled = false;

  onChangeToggle(event: Event): void {
    this.checked = (event.target as HTMLInputElement).checked;
  }
}
