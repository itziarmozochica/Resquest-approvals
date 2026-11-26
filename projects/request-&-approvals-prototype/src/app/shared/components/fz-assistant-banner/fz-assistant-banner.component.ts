import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';

import { AnalyticsRoutes } from '@fz-original/app/modules/reports/analytics-routes';
import { OpenChatbotEntryPoint } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/open-chatbot.event';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { ANALYTICS_BASE_ROUTE } from '@fz-original/app/shared/utils/analytics-breadcrumb.util';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, IgntButtonComponent, TranslateModule],
  selector: 'app-fz-assistant-banner',
  standalone: true,
  styleUrl: './fz-assistant-banner.component.scss',
  templateUrl: './fz-assistant-banner.component.html',
})
export class FzAssistantBannerComponent {
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #router = inject(Router);

  buttonSentiment = input<'primary' | 'secondary'>('primary');
  dismissed = output<void>();

  dismiss(): void {
    this.#chatbotFacade.dismissFzAssistantBanner();
    this.dismissed.emit();
  }

  navigateToChatbot(): void {
    this.#chatbotFacade.setEntryPoint(OpenChatbotEntryPoint.banner);
    this.#router.navigate([ANALYTICS_BASE_ROUTE, AnalyticsRoutes.FzAssistant], { queryParamsHandling: 'merge' });
  }
}
