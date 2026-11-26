import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { CustomerServiceChatFacade } from '../../services/customer-service-chat/customer-service-chat.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-zendesk-launcher',
  styleUrl: './zendesk-launcher.component.scss',
  templateUrl: './zendesk-launcher.component.html',
})
export class ZendeskLauncherComponent {
  readonly #customerServiceChatFacade = inject(CustomerServiceChatFacade);

  protected onClick(): void {
    this.#customerServiceChatFacade.open('header');
  }
}
