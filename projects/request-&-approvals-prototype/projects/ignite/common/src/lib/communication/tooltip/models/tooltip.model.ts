/** Tooltip placement relative to the trigger. Points straight from the given side. */
export type IgntTooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * How the tooltip is triggered.
 *
 * - `hover`: default. Opens on `mouseenter`/`focusin`, closes on `mouseleave`/`focusout`/`Escape`/outside-click.
 * - `manual`: no host listeners. The consumer fully controls visibility through the directive's public
 *   `open()` / `close()` / `toggle()` methods (use a template reference with `#ref="igntTooltip"`).
 * - `hover-focus-click`: same as `hover` plus a host `click` listener. A pointer click goes by the state its
 *   press found (closed opens, open closes), so a tap whose `mouseenter` opens the tooltip leaves it open; a keyboard
 *   click toggles. Useful on touch devices where hover is not available; preserves outside-click and Escape auto-close.
 */
export type IgntTooltipTrigger = 'hover' | 'manual' | 'hover-focus-click';
