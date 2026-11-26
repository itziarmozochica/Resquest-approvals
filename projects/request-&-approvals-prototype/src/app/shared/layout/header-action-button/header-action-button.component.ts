import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { MenuItem } from '@fz-original/app/shared/models/header/header.model';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconButtonComponent, TranslateModule],
  selector: 'app-header-action-button',
  styleUrl: './header-action-button.component.scss',
  templateUrl: './header-action-button.component.html',
})
export class HeaderActionButtonComponent {
  readonly action = input.required<MenuItem>();
  readonly pressed = output<string>();
}
