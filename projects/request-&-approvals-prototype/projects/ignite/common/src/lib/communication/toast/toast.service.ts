import { DOCUMENT } from '@angular/common';
import {
  ApplicationRef,
  computed,
  createComponent,
  DestroyRef,
  EnvironmentInjector,
  inject,
  Injectable,
  inputBinding,
  outputBinding,
  signal,
  type ComponentRef,
  type Signal,
} from '@angular/core';

import { Subject, type Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { igntMergeTranslations } from '../../core/utils/merge-translations.util';
import { IGNT_TOAST_TRANSLATIONS, TOAST_DEFAULT_TRANSLATIONS, type IgntToastTranslations } from './models/toast-translations';
import type { IgntToastConfig, IgntToastOptions, IgntToastRef, IgntToastSentiment, IgntToastState } from './models/toast.model';
import { IgntToastOutletComponent } from './toast-outlet/toast-outlet.component';

// Confirmations are low-stakes and get read fast; warnings and errors need more time to read and react to.
const DEFAULT_DURATION_MS_BY_SENTIMENT: Record<IgntToastSentiment, number> = {
  accent: 4000,
  danger: 7000,
  info: 4000,
  neutral: 4000,
  positive: 4000,
  warning: 7000,
};

/**
 * Shows transient toast notifications in one stack at the top-right corner of the viewport.
 *
 * ### When to use
 * - Confirming a user-initiated action succeeded, failed, or produced a side effect (save, upload, delete)
 * - A message that is not tied to the surrounding page content and can disappear on its own
 *
 * ### When NOT to use
 * - A persistent state, warning, or confirmation tied to the surrounding content → use [Alert](?path=/docs/components-communication-alert--docs) instead.
 * - A single inline field validation message → use [FieldError](?path=/docs/components-fields-field-error--docs) instead.
 *
 * ### Related
 * - [Alert](?path=/docs/components-communication-alert--docs) — persistent, content-tied messaging instead of a transient notification
 *
 * The first `show()` creates a single `IgntToastOutletComponent`, appends it to `document.body` and promotes it to
 * the browser top layer through the native Popover API, so toasts render above every containing block and every
 * z-index stack (CDK overlays included) without a z-index of their own. State is a signal the outlet renders with
 * `@for`; nothing is appended to the DOM by hand after that. The first `show()` creates the outlet and opens its
 * popover, and the last toast to fade out closes it again, so an idle application has nothing in the top layer.
 * The element itself stays mounted, empty and zero-sized: it carries the `aria-live` region, and a region created
 * in the same turn as its first message is one screen readers routinely fail to announce.
 *
 * Copy the toast renders on its own (the dismiss button's accessible name) comes from `IGNT_TOAST_TRANSLATIONS`,
 * provided by the application the way `IGNT_DIALOG_TRANSLATIONS` is, and never from the per-toast config: the
 * words belong to the component, so a caller should not repeat a translation on every call.
 */
@Injectable({ providedIn: 'root' })
export class IgntToastService {
  readonly #applicationRef = inject(ApplicationRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #documentRef = inject(DOCUMENT);
  readonly #environmentInjector = inject(EnvironmentInjector);
  readonly #injectedTranslations = inject(IGNT_TOAST_TRANSLATIONS, { optional: true });
  readonly #toasts = signal<readonly IgntToastState[]>([]);
  readonly #actionSubjectsById = new Map<string, Subject<void>>();
  #outletDrainObserver: MutationObserver | null = null;
  #outletPopoverOpen = false;
  #outletRef: ComponentRef<IgntToastOutletComponent> | null = null;

  /**
   * Toasts currently shown, oldest first.
   */
  readonly toasts: Signal<readonly IgntToastState[]> = this.#toasts.asReadonly();

  constructor() {
    // Registered once here rather than in `#ensureOutlet()`, which would pile a closure onto the root
    // injector every time an outlet is built.
    this.#destroyRef.onDestroy(() => {
      this.#removeOutlet();
    });
  }

  readonly #translations: Signal<IgntToastTranslations> = computed(() =>
    igntMergeTranslations(this.#injectedTranslations, TOAST_DEFAULT_TRANSLATIONS),
  );

  /**
   * Shows a `danger` toast: an error or destructive-state notice.
   */
  danger(description: string, options?: IgntToastOptions): IgntToastRef {
    return this.show({ ...options, description, sentiment: 'danger' });
  }

  /**
   * Removes the toast with this id, as returned by `show()`. A no-op when it is already gone.
   */
  dismiss(id: string): void {
    this.#completeAction(id);
    this.#toasts.update(toasts => toasts.filter(toast => toast.id !== id));
    this.#closeOutletPopoverOnceDrained();
  }

  /**
   * Removes every toast currently shown.
   */
  dismissAll(): void {
    for (const id of [...this.#actionSubjectsById.keys()]) {
      this.#completeAction(id);
    }
    this.#toasts.set([]);
    this.#closeOutletPopoverOnceDrained();
  }

  /**
   * Shows an `info` toast: an informational message.
   */
  info(description: string, options?: IgntToastOptions): IgntToastRef {
    return this.show({ ...options, description, sentiment: 'info' });
  }

  /**
   * Shows a `positive` toast: a success confirmation.
   */
  positive(description: string, options?: IgntToastOptions): IgntToastRef {
    return this.show({ ...options, description, sentiment: 'positive' });
  }

  /**
   * Shows a toast. Defaults and translations are resolved here, once, so the outlet always binds concrete values.
   */
  show(config: IgntToastConfig): IgntToastRef {
    // A toast raised while the previous batch is still fading out keeps the outlet alive.
    this.#outletDrainObserver?.disconnect();
    this.#outletDrainObserver = null;
    this.#ensureOutlet();
    const sentiment = config.sentiment ?? 'info';
    const toast: IgntToastState = {
      actionLabel: config.actionLabel,
      actions: config.actions,
      closeButtonAriaLabel: this.#translations().closeButtonAriaLabel,
      content: config.content,
      description: config.description ?? '',
      duration: config.duration ?? DEFAULT_DURATION_MS_BY_SENTIMENT[sentiment],
      id: uuidv4(),
      sentiment,
      showCloseButton: config.showCloseButton ?? true,
      title: config.title,
    };
    const action = new Subject<void>();
    this.#actionSubjectsById.set(toast.id, action);
    // Newest last (bottom of the stack).
    this.#toasts.update(toasts => [...toasts, toast]);

    return {
      id: toast.id,
      dismiss: () => {
        this.dismiss(toast.id);
      },
      onAction: (): Observable<void> => action.asObservable(),
    };
  }

  /**
   * Shows a `warning` toast: a caution the user should be aware of.
   */
  warning(description: string, options?: IgntToastOptions): IgntToastRef {
    return this.show({ ...options, description, sentiment: 'warning' });
  }

  // Takes the outlet out of the top layer, leaving the empty element mounted. It carries the `aria-live`
  // region, and a region inserted in the same turn as its first message is one screen readers routinely
  // fail to announce, so it has to outlive the toasts.
  #closeOutletPopover(): void {
    const outletElement = this.#outletElement();
    if (outletElement === null || !this.#outletPopoverOpen) {
      return;
    }
    if (typeof outletElement.hidePopover === 'function') {
      outletElement.hidePopover();
    }
    this.#outletPopoverOpen = false;
  }

  // `animate.leave` keeps a dismissed card mounted until its transition ends, so closing the moment the list
  // empties would drop it out of the top layer mid-animation. Wait for the outlet to actually drain.
  #closeOutletPopoverOnceDrained(): void {
    const outletElement = this.#outletElement();
    if (this.#toasts().length > 0 || outletElement === null) {
      return;
    }
    if (outletElement.childElementCount === 0) {
      this.#closeOutletPopover();
      return;
    }
    this.#outletDrainObserver?.disconnect();
    this.#outletDrainObserver = new MutationObserver(() => {
      if (this.#toasts().length === 0 && outletElement.childElementCount === 0) {
        this.#closeOutletPopover();
      }
    });
    this.#outletDrainObserver.observe(outletElement, { childList: true });
  }

  // Completing tells every subscriber the action can no longer fire, so their teardown runs with the toast.
  #completeAction(id: string): void {
    const action = this.#actionSubjectsById.get(id);
    if (action === undefined) {
      return;
    }
    this.#actionSubjectsById.delete(id);
    action.complete();
  }

  // `createComponent` builds the outlet outside any template (a root service has no `ViewContainerRef`),
  // `attachView` puts it in the change-detection tree and `append` puts it in the DOM: the same three calls
  // `@angular/cdk/portal`'s `DomPortalOutlet` makes.
  #ensureOutlet(): void {
    if (this.#outletRef !== null) {
      this.#openOutletPopover();
      return;
    }
    this.#outletRef = createComponent(IgntToastOutletComponent, {
      bindings: [
        inputBinding('toasts', this.#toasts),
        outputBinding<string>('actionClicked', id => {
          this.#actionSubjectsById.get(id)?.next();
          // Acting on a toast dismisses it, as it does in Material and Sonner. Without this the click's own
          // focus would also pause the timer, leaving the toast pinned until dismissed by hand.
          this.dismiss(id);
        }),
        outputBinding<string>('dismissed', id => {
          this.dismiss(id);
        }),
      ],
      environmentInjector: this.#environmentInjector,
    });
    this.#applicationRef.attachView(this.#outletRef.hostView);
    // `ComponentRef.location` is an untyped `ElementRef`, so `nativeElement` is `any`; the host of a component is always an element.
    const outletElement = this.#outletRef.location.nativeElement as HTMLElement;
    this.#documentRef.body.append(outletElement);
    this.#openOutletPopover();
  }

  // ponytail: the `typeof` guard is the fail-safe for engines without the Popover API (and for jsdom); the
  // outlet's SCSS then behaves as a plain fixed stack. `showPopover()` throws on an already-open popover.
  #openOutletPopover(): void {
    const outletElement = this.#outletElement();
    if (outletElement === null || this.#outletPopoverOpen) {
      return;
    }
    if (typeof outletElement.showPopover === 'function') {
      outletElement.showPopover();
    }
    this.#outletPopoverOpen = true;
  }

  // `ComponentRef.location` is an untyped `ElementRef`, so `nativeElement` is `any`; the host of a component is always an element.
  #outletElement(): HTMLElement | null {
    return this.#outletRef === null ? null : (this.#outletRef.location.nativeElement as HTMLElement);
  }

  #removeOutlet(): void {
    this.#outletDrainObserver?.disconnect();
    this.#outletDrainObserver = null;
    const outletRef = this.#outletRef;
    if (outletRef === null) {
      return;
    }
    const outletElement = this.#outletElement();
    this.#outletRef = null;
    this.#outletPopoverOpen = false;
    outletRef.destroy();
    outletElement?.remove();
  }
}
