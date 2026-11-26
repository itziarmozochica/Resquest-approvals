import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../../../../shared/icons/icons.module';

@Component({
  selector: 'app-ambassador-register-message',
  templateUrl: './ambassador-register-message.component.html',
  styleUrls: ['./ambassador-register-message.component.scss'],
  standalone: true,
  imports: [IgntWrapperCardComponent, IconsModule, NgIf, IgntButtonComponent, TranslateModule],
})
export class AmbassadorRegisterMessageComponent {
  @Input() set type(value: 'success' | 'error') {
    this.isSuccess = value === 'success';
    this.isError = value === 'error';
  }

  isError = false;
  isSuccess = false;

  close(): void {
    window.location.reload();
  }
}
