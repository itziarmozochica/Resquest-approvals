import { ConnectedPosition, FlexibleConnectedPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  booleanAttribute,
  ComponentRef,
  Directive,
  ElementRef,
  inject,
  input,
  numberAttribute,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import type { Subscription } from 'rxjs';

import type { IgntTooltipPlacement, IgntTooltipTrigger } from './models/tooltip.model';
import { IgntTooltipOverlayComponent } from './tooltip-overlay.component';

const POSITIONS: Record<IgntTooltipPlacement, ConnectedPosition> = {
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 4 },
  left: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -4 },
  right: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 4 },
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -4 },
};

/**
 * Shows contextual information on hover, focus, or tap. Always uses a single neutral style — there is no sentiment or color variant.
 *
 * ### When to use
 * - Column headers or labels that need extra explanation
 * - Truncated text (show full content on hover)
 * - Disabled buttons (explain why they are disabled)
 * - Info icons next to form fields
 *
 * ### When NOT to use
 * - Content critical to complete the action → use inline text instead
 * - Complex interactions or rich content → use Dialog or SidePanel
 * - Non-interactive elements → use `aria-label` directly
 *
 * ### Placement
 * Prefer `top`. CDK auto-adjusts to a fallback if no room.
 *
 * ### Related
 * - [Dialog](?path=/docs/components-containment-dialog-modal--docs) — richer content requiring user action to close
 * - [SidePanel](?path=/docs/components-containment-dialog-sidepanel--docs) — persistent panel for complex secondary content
 */
@Directive({
  exportAs: 'igntTooltip',
  host: {
    '(click)': '_onClickToggle($event)',
    '(focusin)': '_onHoverOpen()',
    '(focusout)': '_onHoverClose()',
    '(keydown.escape)': '_onHoverClose()',
    '(mouseenter)': '_onHoverOpen()',
    '(mouseleave)': '_onHoverClose()',
    '(pointerdown)': '_onPointerDown()',
  },
  selector: '[igntTooltip]',
  standalone: true,
})
export class IgntTooltipDirective implements OnDestroy {
  /** Whether the tooltip is suppressed entirely. */
  readonly tooltipDisabled = input(false, { transform: booleanAttribute });
  /** Text content shown inside the tooltip. Ignored when `template` is set. */
  readonly tooltipLabel = input<string | null>(null);
  /** Maximum width of the tooltip body in pixels. */
  readonly tooltipMaxWidth = input<number>(256);
  /**
   * Milliseconds to wait before actually opening the tooltip. Default `0` opens immediately.
   * Useful to avoid flicker on fast-moving pointers. A pending delayed open is cancelled if
   * `close()` is called (e.g. the user leaves the trigger) or the directive is destroyed.
   */
  readonly tooltipOpenDelay = input(0, { transform: numberAttribute });
  /** Preferred placement relative to the trigger. CDK automatically uses a fallback if there is no room. */
  readonly tooltipPlacement = input<IgntTooltipPlacement>('top');
  /** Angular `TemplateRef` rendered inside the tooltip instead of plain text. Use when the content needs markup (lists, bold text, links). When set, `label` is ignored. */
  readonly tooltipTemplate = input<TemplateRef<unknown> | null>(null);
  /**
   * How the tooltip is triggered. Default `'hover'` keeps the auto open/close behavior on hover/focus.
   * Set to `'manual'` to fully control visibility via `open()` / `close()` / `toggle()`.
   */
  readonly tooltipTrigger = input<IgntTooltipTrigger>('hover');

  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #overlay = inject(Overlay);
  readonly #viewContainerRef = inject(ViewContainerRef);

  #openDelayTimer: ReturnType<typeof setTimeout> | null = null;
  // A press can open the tooltip before its `click` (a tap's `mouseenter`, a mouse's `focusin`), so a click goes by the state its press found.
  #isOpenAtPointerDown: boolean | null = null;
  #outsideClickSub: Subscription | null = null;
  #overlayRef: OverlayRef | null = null;
  #positionStrategy: FlexibleConnectedPositionStrategy | null = null;
  #positionSub: Subscription | null = null;
  #tooltipRef: ComponentRef<IgntTooltipOverlayComponent> | null = null;

  /** Closes the tooltip if it is currently open, and cancels any pending delayed open. */
  close(): void {
    this.#cancelOpenDelay();
    if (!this.#overlayRef?.hasAttached()) return;
    this.#positionSub?.unsubscribe();
    this.#positionSub = null;
    this.#outsideClickSub?.unsubscribe();
    this.#outsideClickSub = null;
    this.#overlayRef.detach();
    this.#tooltipRef = null;
    this.#elementRef.nativeElement.removeAttribute('aria-describedby');
  }

  ngOnDestroy(): void {
    this.#cancelOpenDelay();
    this.close();
    this.#overlayRef?.dispose();
    this.#overlayRef = null;
  }

  /**
   * Opens the tooltip. No-op when `tooltipDisabled` is true, when neither `tooltipLabel` nor
   * `tooltipTemplate` resolve to content, or when the tooltip is already open. When
   * `tooltipOpenDelay` is greater than zero the actual overlay attach is deferred and can be
   * cancelled by `close()` or directive destruction.
   */
  open(): void {
    const hasLabel = this.tooltipLabel() !== null && this.tooltipLabel() !== '';
    const hasTemplate = this.tooltipTemplate() !== null;

    if (this.tooltipDisabled() || (!hasLabel && !hasTemplate)) return;
    if (this.#overlayRef?.hasAttached() || this.#openDelayTimer !== null) return;

    const delay = this.tooltipOpenDelay();
    if (delay > 0) {
      this.#openDelayTimer = setTimeout(() => {
        this.#openDelayTimer = null;
        this.#attachOverlay();
      }, delay);
      return;
    }

    this.#attachOverlay();
  }

  /** Toggles the tooltip open/closed. */
  toggle(): void {
    if (this.#overlayRef?.hasAttached()) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Host listener bridge — only acts when the trigger mode opts into click. A tap's compatibility `mouseenter`, or a
   * mouse press's `focusin`, can open the tooltip before its `click`, so a pointer click opens it when its press found
   * it closed and closes it when its press found it open. A keyboard or programmatic click (`detail` 0) has no press of
   * its own and toggles from the current state, so a press that never ended in a click leaves nothing behind.
   */
  protected _onClickToggle(event: MouseEvent): void {
    const wasOpen = (event.detail > 0 ? this.#isOpenAtPointerDown : null) ?? this.#overlayRef?.hasAttached() ?? false;
    this.#isOpenAtPointerDown = null;
    if (this.tooltipTrigger() !== 'hover-focus-click') return;

    if (wasOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Host listener bridge — only forwards to `close()` while the trigger mode includes hover. */
  protected _onHoverClose(): void {
    if (this.tooltipTrigger() !== 'manual') this.close();
  }

  /** Host listener bridge — only forwards to `open()` while the trigger mode includes hover. */
  protected _onHoverOpen(): void {
    if (this.tooltipTrigger() !== 'manual') this.open();
  }

  /** Host listener bridge — remembers whether the press found the tooltip open, for the click that follows. */
  protected _onPointerDown(): void {
    this.#isOpenAtPointerDown = this.#overlayRef?.hasAttached() ?? false;
  }

  #attachOverlay(): void {
    this.#overlayRef ??= this.#createOverlayRef();

    const portal = new ComponentPortal(IgntTooltipOverlayComponent, this.#viewContainerRef);
    this.#tooltipRef = this.#overlayRef.attach(portal);
    this.#tooltipRef.setInput('label', this.tooltipLabel());
    this.#tooltipRef.setInput('tooltipTemplate', this.tooltipTemplate());
    this.#tooltipRef.setInput('placement', this.tooltipPlacement());
    this.#tooltipRef.setInput('maxWidth', this.tooltipMaxWidth());
    this.#elementRef.nativeElement.setAttribute('aria-describedby', this.#tooltipRef.instance.tooltipId);

    // Subscribe then re-apply so the arrow reflects the position CDK actually chose,
    // including any fallback (e.g. requested 'top' but no room → CDK uses 'bottom').
    if (this.#positionStrategy !== null) {
      this.#positionSub = this.#positionStrategy.positionChanges.subscribe(({ connectionPair }) => {
        this.#tooltipRef?.setInput('placement', this.#resolvePlacement(connectionPair));
      });
      this.#positionStrategy.apply();
    }

    if (this.tooltipTrigger() !== 'manual') {
      this.#outsideClickSub = this.#overlayRef.outsidePointerEvents().subscribe(event => {
        if (!this.#elementRef.nativeElement.contains(event.target as Node)) {
          this.close();
        }
      });
    }
  }

  #buildPositionStrategy(): FlexibleConnectedPositionStrategy {
    const preferred = POSITIONS[this.tooltipPlacement()];
    const fallbacks = (Object.keys(POSITIONS) as IgntTooltipPlacement[])
      .filter(key => key !== this.tooltipPlacement())
      .map(key => POSITIONS[key]);

    return this.#overlay
      .position()
      .flexibleConnectedTo(this.#elementRef)
      .withPositions([preferred, ...fallbacks])
      .withPush(false);
  }

  #cancelOpenDelay(): void {
    if (this.#openDelayTimer === null) return;
    clearTimeout(this.#openDelayTimer);
    this.#openDelayTimer = null;
  }

  #createOverlayRef(): OverlayRef {
    this.#positionStrategy = this.#buildPositionStrategy();
    return this.#overlay.create({
      positionStrategy: this.#positionStrategy,
      scrollStrategy: this.#overlay.scrollStrategies.reposition(),
    });
  }

  #resolvePlacement(pair: ConnectedPosition): IgntTooltipPlacement {
    const match = (Object.entries(POSITIONS) as [IgntTooltipPlacement, ConnectedPosition][]).find(
      ([, candidate]) =>
        candidate.originX === pair.originX &&
        candidate.originY === pair.originY &&
        candidate.overlayX === pair.overlayX &&
        candidate.overlayY === pair.overlayY,
    );
    return match?.[0] ?? 'top';
  }
}
