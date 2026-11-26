import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
  WritableSignal,
  type Provider,
} from '@angular/core';
import { Router } from '@angular/router';

import { AnalyticsRoutes } from '@fz-original/app/modules/reports/analytics-routes';
import { ChatbotContext } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/chatbot-context';
import { OpenChatbotEntryPoint } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/open-chatbot.event';
import { CHATBOT_CONTEXT } from '@fz-original/app/shared/components/chatbot-modal/chatbot-context.token';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { FzAssistantDialogOverlayService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-dialog-overlay.service';
import { FzAssistantDockUiService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-dock-ui.service';
import { ANALYTICS_BASE_ROUTE } from '@fz-original/app/shared/utils/analytics-breadcrumb.util';
import { FZ_ASSISTANT_DOCK_WIDTH_KEYBOARD_STEP } from '@fz-original/app/shared/utils/fz-assistant-dock-width.util';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { TranslateModule } from '@ngx-translate/core';

import { closeChatbot } from '../../tracking/events/close-chatbot.event';
import { openChatbot } from '../../tracking/events/open-chatbot.event';
import { fzAssistantTrackingProvider } from '../../tracking/fz-assistant.tracking-provider';
import { FzAssistantChatSurfaceComponent } from '../fz-assistant-chat-surface/fz-assistant-chat-surface.component';

/**
 * The surface's real DI providers, exported so the tracking contract spec can assert the exact
 * array this component registers without reaching into Angular's private decorator metadata.
 */
export const FZ_ASSISTANT_LAYOUT_DOCK_PROVIDERS: Provider[] = [
  { provide: CHATBOT_CONTEXT, useValue: ChatbotContext.layoutDock },
  ...fzAssistantTrackingProvider(),
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onViewportResize()',
    '[class.fz-assistant-layout-dock-host--resizing]': 'isResizing()',
    '[style.flex-basis.px]': 'dockWidth()',
    '[style.width.px]': 'dockWidth()',
  },
  imports: [FzAssistantChatSurfaceComponent, TranslateModule],
  providers: FZ_ASSISTANT_LAYOUT_DOCK_PROVIDERS,
  selector: 'app-fz-assistant-layout-dock',
  standalone: true,
  styleUrl: './fz-assistant-layout-dock.component.scss',
  templateUrl: './fz-assistant-layout-dock.component.html',
})
export class FzAssistantLayoutDockComponent implements OnDestroy {
  private readonly chatSurface = viewChild(FzAssistantChatSurfaceComponent);
  readonly #chatbotContext = inject(CHATBOT_CONTEXT);
  readonly #chatbotFacade = inject(ChatbotFacade);
  readonly #dialogOverlay = inject(FzAssistantDialogOverlayService);
  readonly #dockUi = inject(FzAssistantDockUiService);
  readonly #document = inject(DOCUMENT);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #router = inject(Router);
  #bodyCursorBeforeDrag: string | null = null;
  #bodyUserSelectBeforeDrag = '';
  #resizePointerId: number | null = null;
  #resizeStartPointerX = 0;
  #resizeStartWidth = 0;

  protected readonly dockMaxWidth = this.#dockUi.dockMaxWidth;
  protected readonly dockMinWidth = this.#dockUi.dockMinWidth;
  protected readonly dockWidth = this.#dockUi.dockWidth;
  protected readonly isResizing: WritableSignal<boolean> = signal<boolean>(false);

  constructor() {
    const entryPoint = this.#dockUi.openedByAutoOpen() ? OpenChatbotEntryPoint.autoOpen : this.#chatbotFacade.getEntryPoint();
    this.#fzTracking.track(openChatbot({ chatbotContext: this.#chatbotContext, entryPoint }));
    this.#dockUi.syncViewportWidth();
  }

  ngOnDestroy(): void {
    this.#endResize();
    this.#fzTracking.track(closeChatbot({ chatbotContext: this.#chatbotContext }));
  }

  protected onCloseRequested(): void {
    this.#dockUi.closePanel();
  }

  /**
   * The handoff is not a dismissal, so it must not suppress the rest of today's auto-opens.
   */
  protected onCustomerServiceRequested(): void {
    this.#dockUi.closePanelWithoutDismissal();
  }

  protected onExpandRequested(): void {
    const threadId = this.#chatbotFacade.threadId();
    if (threadId) {
      void this.#router.navigate([ANALYTICS_BASE_ROUTE, AnalyticsRoutes.FzAssistant, threadId], { queryParamsHandling: 'merge' });
    } else {
      void this.#router.navigate([ANALYTICS_BASE_ROUTE, AnalyticsRoutes.FzAssistant], { queryParamsHandling: 'merge' });
    }
    this.#dockUi.closePanel();
  }

  protected onOpenAsPopupRequested(): void {
    const sendSubscriptionHandoff = this.chatSurface()?.detachSendSubscriptionForRouteHandoff() ?? null;
    this.#dockUi.closePanel();
    this.#dialogOverlay.open({
      entryPoint: OpenChatbotEntryPoint.popup,
      resetConversation: false,
      sendSubscriptionHandoff,
    });
  }

  protected onResizeDoubleClick(): void {
    this.#dockUi.resetDockWidth();
  }

  protected onResizeKeydown(event: KeyboardEvent): void {
    const widenKey: string = this.#isRtl() ? 'ArrowRight' : 'ArrowLeft';
    const narrowKey: string = this.#isRtl() ? 'ArrowLeft' : 'ArrowRight';

    switch (event.key) {
      case widenKey: {
        this.#dockUi.setDockWidth(this.dockWidth() + FZ_ASSISTANT_DOCK_WIDTH_KEYBOARD_STEP);
        break;
      }
      case narrowKey: {
        this.#dockUi.setDockWidth(this.dockWidth() - FZ_ASSISTANT_DOCK_WIDTH_KEYBOARD_STEP);
        break;
      }
      case 'Home': {
        this.#dockUi.setDockWidth(this.dockMinWidth);
        break;
      }
      case 'End': {
        this.#dockUi.setDockWidth(this.dockMaxWidth());
        break;
      }
      default: {
        return;
      }
    }

    event.preventDefault();
  }

  protected onResizePointerDown(event: PointerEvent): void {
    const handle: HTMLElement | null = this.#handleOf(event);
    if (event.button !== 0 || handle === null || this.#resizePointerId !== null) {
      return;
    }

    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      return;
    }

    this.#resizePointerId = event.pointerId;
    this.#resizeStartPointerX = event.clientX;
    this.#resizeStartWidth = this.dockWidth();
    this.isResizing.set(true);
    this.#setDragStylesOnBody(true);
    event.preventDefault();
    handle.focus();
  }

  protected onResizePointerMove(event: PointerEvent): void {
    if (this.#resizePointerId !== event.pointerId) {
      return;
    }

    const travel: number = (event.clientX - this.#resizeStartPointerX) * (this.#isRtl() ? -1 : 1);
    this.#dockUi.setDockWidth(this.#resizeStartWidth - travel);
    event.preventDefault();
  }

  protected onResizePointerUp(event: PointerEvent): void {
    if (this.#resizePointerId !== event.pointerId) {
      return;
    }

    const handle: HTMLElement | null = this.#handleOf(event);
    try {
      if (handle?.hasPointerCapture(event.pointerId) === true) {
        handle.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The capture is already gone, which is the state this branch was trying to reach.
    }
    this.#endResize();
  }

  protected onViewportResize(): void {
    this.#dockUi.syncViewportWidth();
  }

  #endResize(): void {
    this.#resizePointerId = null;
    this.isResizing.set(false);
    this.#setDragStylesOnBody(false);
  }

  #handleOf(event: PointerEvent): HTMLElement | null {
    return event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  }

  #isRtl(): boolean {
    return this.#document.defaultView?.getComputedStyle(this.#host.nativeElement).direction === 'rtl';
  }

  #setDragStylesOnBody(dragging: boolean): void {
    const body: HTMLElement | null = this.#document.body;
    if (body === null) {
      return;
    }

    if (dragging) {
      if (this.#bodyCursorBeforeDrag === null) {
        this.#bodyCursorBeforeDrag = body.style.cursor;
        this.#bodyUserSelectBeforeDrag = body.style.userSelect;
      }
      body.style.cursor = 'col-resize';
      body.style.userSelect = 'none';
      return;
    }

    if (this.#bodyCursorBeforeDrag === null) {
      return;
    }

    body.style.cursor = this.#bodyCursorBeforeDrag;
    body.style.userSelect = this.#bodyUserSelectBeforeDrag;
    this.#bodyCursorBeforeDrag = null;
    this.#bodyUserSelectBeforeDrag = '';
  }
}
