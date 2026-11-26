import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import {
  OpenChatbotEntryPoint,
  OpenChatbotEntryPointET,
} from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/open-chatbot.event';
import { AiSparkleIconComponent } from '@fz-original/app/shared/components/ai-sparkle-icon/ai-sparkle-icon.component';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { FzAssistantDialogOverlayService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-dialog-overlay.service';
import { FzAssistantDockUiService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-dock-ui.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AiSparkleIconComponent, TranslateModule],
  selector: 'app-fz-assistant-top-bar-entry',
  standalone: true,
  styleUrl: './fz-assistant-top-bar-entry.component.scss',
  templateUrl: './fz-assistant-top-bar-entry.component.html',
})
export class FzAssistantTopBarEntryComponent {
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #dialogOverlay = inject(FzAssistantDialogOverlayService);
  readonly #dockUi = inject(FzAssistantDockUiService);

  readonly entryPoint = input<OpenChatbotEntryPointET>(OpenChatbotEntryPoint.topBar);

  onButtonClick(): void {
    if (this.#dockUi.dockRouteEligible()) {
      if (this.#dockUi.panelOpen()) {
        return;
      }

      this.#chatbotFacade.resetConversation();
      this.#chatbotFacade.setEntryPoint(this.entryPoint());
      this.#dockUi.openPanel();
      return;
    }

    this.#dialogOverlay.open({
      entryPoint: this.entryPoint(),
      resetConversation: true,
    });
  }
}
