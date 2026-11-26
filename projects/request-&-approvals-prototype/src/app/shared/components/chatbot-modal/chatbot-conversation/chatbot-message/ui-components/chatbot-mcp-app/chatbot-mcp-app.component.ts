import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import {
  JsonRpcOutbound,
  McpAppComponentData,
  McpAppContentBlock,
  McpAppHost,
  McpAppHostContext,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-mcp-app.model';
import { ChatbotFacade } from '@fz-original/app/shared/services/chatbot/chatbot.facade';
import { FzAssistantComposerService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-composer.service';
import { FzAssistantMcpAppBridgeService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-mcp-app-bridge.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { captureAncestorScroll } from '@fz-original/app/shared/utils/chatbot/preserve-ancestor-scroll.util';
import { environment } from '@fz-original/environments/environment';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';

import { applyMcpAppHostTheme } from './fz-assistant-mcp-app-html.util';

const DEFAULT_FRAME_HEIGHT_PX = 200;
const MIN_FRAME_HEIGHT_PX = 200;
const MAX_FRAME_HEIGHT_PX = 2000;

/**
 * Host for an MCP App panel rendered inside the FZ Assistant chat.
 *
 * It owns the iframe and Angular wiring (DI, partner/thread state, HTTP) and
 * implements {@link McpAppHost}: the JSON-RPC routing lives in
 * {@link FzAssistantMcpAppBridgeService}, which calls back into this component
 * to perform side effects. The panel itself loads `@modelcontextprotocol/ext-apps`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-chatbot-mcp-app',
  standalone: true,
  styleUrl: './chatbot-mcp-app.component.scss',
  templateUrl: './chatbot-mcp-app.component.html',
})
export class ChatbotMcpAppComponent implements OnInit, McpAppHost {
  private readonly http = inject(HttpClient);
  private readonly partnerService = inject(PartnerService);
  private readonly chatbotFacade = inject(ChatbotFacade);
  private readonly composer = inject(FzAssistantComposerService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bridge = inject(FzAssistantMcpAppBridgeService);
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('mcpFrame');

  /** Chatbot UI component contract — see {@link McpAppComponentData}. */
  data = input.required<McpAppComponentData>();

  /** Iframe height in px; driven by the panel's `size-changed` notifications. */
  readonly frameHeight: WritableSignal<number> = signal<number>(DEFAULT_FRAME_HEIGHT_PX);

  /**
   * Iframe URL. For `ui://` resources, fetches HTML via HttpClient (with auth headers)
   * and creates a Blob URL. Legacy HTTP URLs are passed through unchanged.
   */
  readonly iframeUrlSafe: WritableSignal<SafeResourceUrl> = signal<SafeResourceUrl>(
    this.sanitizer.bypassSecurityTrustResourceUrl('about:blank'),
  );

  /**
   * Origin the panel document is served from. `null` means the source check
   * (`event.source === iframeWindow`) is the only guard — used for blob URLs
   * because sandboxed blob iframes report `event.origin` as `'null'` or the
   * parent origin, never a meaningful blob origin.
   * Legacy HTTP URLs validate against their parsed origin.
   */
  private readonly expectedOrigin: WritableSignal<string | null> = signal<string | null>(null);

  /** Revoked on destroy and before replacing — blob URLs are widget-scoped only. */
  #panelBlobUrl: string | null = null;
  #panelDomObserver: MutationObserver | null = null;
  #remeasureRaf: number | null = null;

  buildHostContext(): McpAppHostContext {
    return {
      appName: 'FZ Assistant',
      locale: navigator.language || 'en',
      partnerId: this.partnerId ?? null,
      theme: 'light',
      threadId: this.threadId ?? null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Proxy a tool call to ``/mcp-app-proxy``. No agent turn is started here; the
   * raw result dict is returned to the bridge, which wraps it as a CallToolResult.
   */
  callServerTool(
    toolName: string,
    args: Record<string, unknown>,
    resolve: (raw: Record<string, unknown>) => void,
    reject: (message: string) => void,
  ): void {
    const partnerId: number | undefined = this.partnerId;
    if (partnerId === undefined) {
      reject('No active partner session');
      return;
    }

    const url = `${environment.agentsBaseUrl}/fz-assistant/partner/${partnerId}/chatbot/mcp-app-proxy`;
    this.http
      .post<Record<string, unknown>>(url, { arguments: args, tool_name: toolName })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: err => reject(err?.message ?? 'Proxy error'),
        next: (result: Record<string, unknown>) => resolve(result ?? {}),
      });
  }

  deliverMessage(text: string, autoSubmit: boolean): void {
    if (autoSubmit) {
      this.chatbotFacade.sendMessage(text).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    } else {
      this.composer.setDraft(text);
    }
  }

  initialToolResultPayload(): Record<string, unknown> {
    return this.data().meta?.tool_result ?? { mcp_app_uri: this.data().id };
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.#detachPanelDomObserver();
      this.#cancelScheduledRemeasure();
      this.#revokePanelBlobUrl();
    });
    this.#loadPanelResource();

    fromEvent<MessageEvent>(window, 'message')
      .pipe(
        filter((event: MessageEvent) => event.source === this.iframeWindow && this.#isTrustedOrigin(event.origin)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: MessageEvent) => this.bridge.route(event.data, this));
  }

  onFrameLoad(): void {
    this.#attachPanelDomObserver();
    this.#scheduleRemeasure();
  }

  // --- McpAppHost ---------------------------------------------------------

  openExternalLink(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  postToFrame(message: JsonRpcOutbound): void {
    this.iframeWindow?.postMessage(message, this.expectedOrigin() ?? '*');
  }

  resizeFrame(height: number): void {
    this.#scheduleRemeasure(height);
  }

  /**
   * Handle ``updateModelContext``. Default is **silent** (Claude semantics): the
   * backend injects the context without running the agent. A widget opts into an
   * immediate reaction with ``structuredContent._hostHints.triggerResponse=true``;
   * the bridge has already stripped that directive before this point. The reply is
   * sent via ``ack`` so the panel's ``await`` resolves regardless of the outcome.
   */
  updateModelContext(
    content: McpAppContentBlock[],
    structuredContent: Record<string, unknown> | undefined,
    triggerResponse: boolean,
    ack: () => void,
  ): void {
    const partnerId: number | undefined = this.partnerId;
    const threadId: string | null = this.threadId;
    if (partnerId === undefined || !threadId) {
      ack();
      return;
    }

    const url = `${environment.agentsBaseUrl}/fz-assistant/partner/${partnerId}/chatbot/mcp-app-context`;
    this.http
      .post<{ run_id: string | null; thread_id: string }>(url, {
        content,
        structured_content: structuredContent ?? null,
        thread_id: threadId,
        trigger_response: triggerResponse,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => ack(),
        next: response => {
          ack();
          // Only poll/display when the widget asked for an agent reaction.
          if (triggerResponse && response.run_id) {
            this.chatbotFacade.displayRunResult(response.run_id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
          }
        },
      });
  }

  /** Accept messages only from the panel's known origin (the source check is the primary guard). */
  #isTrustedOrigin(origin: string): boolean {
    const expected: string | null = this.expectedOrigin();
    return expected === null || origin === expected;
  }

  #attachPanelDomObserver(): void {
    this.#detachPanelDomObserver();

    try {
      const doc: Document | null | undefined = this.frame()?.nativeElement.contentDocument;
      if (!doc?.body) {
        return;
      }

      this.#panelDomObserver = new MutationObserver(() => {
        this.#scheduleRemeasure();
      });
      this.#panelDomObserver.observe(doc.body, {
        childList: true,
        subtree: true,
      });
    } catch {}
  }

  #detachPanelDomObserver(): void {
    this.#panelDomObserver?.disconnect();
    this.#panelDomObserver = null;
  }

  #cancelScheduledRemeasure(): void {
    if (this.#remeasureRaf === null) {
      return;
    }

    cancelAnimationFrame(this.#remeasureRaf);
    this.#remeasureRaf = null;
  }

  #scheduleRemeasure(reportedFallback?: number): void {
    this.#cancelScheduledRemeasure();

    this.#remeasureRaf = requestAnimationFrame(() => {
      this.#remeasureRaf = requestAnimationFrame(() => {
        this.#remeasureRaf = null;
        this.#applyRemeasuredHeight(reportedFallback);
      });
    });
  }

  #applyRemeasuredHeight(reportedFallback?: number): void {
    const iframe: HTMLIFrameElement | undefined = this.frame()?.nativeElement;
    if (!iframe) {
      if (reportedFallback !== undefined) {
        this.frameHeight.set(this.#clampFrameHeight(reportedFallback));
      }
      return;
    }

    // Collapsing the frame is what lets the panel report its intrinsic height, but it
    // also makes the browser clamp every scrollable ancestor to the shrunken content —
    // and restoring the height below does not restore those offsets. Without this the
    // conversation jumps upward on every panel DOM mutation, e.g. once per keystroke in
    // a widget that re-renders as the user types. The jump is `frameHeight - 200` px at
    // most (the CSS `min-height` floors the collapse), so it reaches the very top only
    // when the panel makes up the bulk of the conversation's height.
    const restoreAncestorScroll: () => void = captureAncestorScroll(iframe);

    try {
      iframe.style.height = '0px';
      void iframe.offsetHeight;

      const measuredHeight: number | null = this.#readPanelContentHeight();
      const nextHeight: number = this.#clampFrameHeight(measuredHeight ?? reportedFallback ?? this.frameHeight());
      // Written imperatively as well as through the `[style.height.px]` binding: the
      // height must be back before this frame yields, whereas the binding only applies
      // on the next change-detection pass.
      iframe.style.height = `${nextHeight}px`;
      // Commit the restored height before `restoreAncestorScroll()` writes the offsets
      // back: a scroll write is clamped against the last committed layout, so a restore
      // against a stale *collapsed* extent would land short — the very symptom this guard
      // exists to prevent. Blink and WebKit both flush layout inside the `scrollTop`
      // setter today (measured, with and without this line), so it is defence in depth
      // rather than load-bearing: it states the ordering the code relies on instead of
      // leaving it to an engine implementation detail.
      void iframe.offsetHeight;
      this.frameHeight.set(nextHeight);
    } finally {
      restoreAncestorScroll();
    }
  }

  #clampFrameHeight(height: number): number {
    return Math.min(MAX_FRAME_HEIGHT_PX, Math.max(MIN_FRAME_HEIGHT_PX, Math.round(height)));
  }

  #readPanelContentHeight(): number | null {
    try {
      const doc: Document | null | undefined = this.frame()?.nativeElement.contentDocument;
      if (!doc?.body) {
        return null;
      }

      const body: HTMLElement = doc.body;
      let contentBottom = 0;
      for (const child of Array.from(body.children)) {
        if (!(child instanceof HTMLElement)) {
          continue;
        }
        contentBottom = Math.max(contentBottom, child.offsetTop + child.offsetHeight);
      }

      const styles: CSSStyleDeclaration =
        doc.defaultView?.getComputedStyle(body) ??
        ({
          paddingBottom: '0',
          paddingTop: '0',
        } as CSSStyleDeclaration);
      const paddingTop: number = Number.parseFloat(styles.paddingTop) || 0;
      const paddingBottom: number = Number.parseFloat(styles.paddingBottom) || 0;
      const fromChildren: number = contentBottom + paddingTop + paddingBottom;
      const fromScroll: number = Math.max(body.scrollHeight, doc.documentElement.scrollHeight);

      return Math.max(fromChildren, fromScroll);
    } catch {
      return null;
    }
  }

  /**
   * Load the panel resource. For `ui://` URIs, fetch HTML via HttpClient (which includes
   * auth headers via interceptors) and create a Blob URL. For legacy HTTP URLs, use directly.
   */
  #loadPanelResource(): void {
    const id: string = this.data().id;

    if (id.startsWith('ui://')) {
      const partnerId: number | undefined = this.partnerService.getPartner()?.id;
      if (!partnerId) {
        this.iframeUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl('about:blank'));
        return;
      }

      const url = `${environment.agentsBaseUrl}/fz-assistant/partner/${partnerId}/chatbot/mcp-app-resource?uri=${encodeURIComponent(id)}`;
      this.http
        .get(url, { responseType: 'text' })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: () => {
            this.iframeUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl('about:blank'));
          },
          next: (html: string) => {
            this.#revokePanelBlobUrl();
            const blob: Blob = new Blob([applyMcpAppHostTheme(html)], { type: 'text/html' });
            const blobUrl: string = URL.createObjectURL(blob);
            this.#panelBlobUrl = blobUrl;
            this.iframeUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl));
            this.expectedOrigin.set(null);
          },
        });
    } else {
      this.iframeUrlSafe.set(this.sanitizer.bypassSecurityTrustResourceUrl(id));
      try {
        const parsedOrigin: string = new URL(id, window.location.href).origin;
        this.expectedOrigin.set(parsedOrigin);
      } catch {
        this.expectedOrigin.set(null);
      }
    }
  }

  private get iframeWindow(): Window | null {
    return this.frame()?.nativeElement?.contentWindow ?? null;
  }

  private get partnerId(): number | undefined {
    return this.partnerService.getPartner()?.id;
  }

  private get threadId(): string | null {
    return this.chatbotFacade.threadId();
  }

  #revokePanelBlobUrl(): void {
    if (this.#panelBlobUrl === null) {
      return;
    }

    URL.revokeObjectURL(this.#panelBlobUrl);
    this.#panelBlobUrl = null;
  }
}
