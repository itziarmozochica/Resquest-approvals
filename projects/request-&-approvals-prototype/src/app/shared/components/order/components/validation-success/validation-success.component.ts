import { Component, Input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-validation-success-modal',
  styleUrl: './validation-success.component.scss',
  templateUrl: './validation-success.component.html',
})
export class ValidationSuccessComponent {
  @Input() tickets = '';
}
