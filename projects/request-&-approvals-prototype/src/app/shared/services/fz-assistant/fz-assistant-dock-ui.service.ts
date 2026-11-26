import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, Signal, signal } from '@angular/core';

import {
  isFzAssistantDockDismissedForToday,
  markFzAssistantDockDismissedForToday,
} from '@fz-original/app/shared/utils/fz-assistant-dock-auto-open.util';
import {
  clampFzAssistantDockWidth,
  clampFzAssistantDockWidthToBounds,
  FZ_ASSISTANT_DOCK_WIDTH_DEFAULT,
  FZ_ASSISTANT_DOCK_WIDTH_MIN,
  fzAssistantDockMaxWidth,
} from '@fz-original/app/shared/utils/fz-assistant-dock-width.util';
import { STORAGE_SERVICE } from '@fz/storage';

/**
 * Coordinates the in-layout Fz Assistant right dock: route eligibility (set by {@link LayoutComponent};
 * default-on for desktop shell access unless route data is `fzAssistantDock: 'off'`),
 * whether the panel is open (toggled from header / sidebar), and how wide the user dragged it.
 */
@Injectable({
  providedIn: 'root',
})
export class FzAssistantDockUiService {
  readonly #document = inject(DOCUMENT);
  readonly #dockRouteEligible = signal<boolean>(false);
  readonly #openedByAutoOpen = signal<boolean>(false);
  readonly #panelOpen = signal<boolean>(false);
  readonly #requestedDockWidth = signal<number>(FZ_ASSISTANT_DOCK_WIDTH_DEFAULT);
  readonly #storage = inject(STORAGE_SERVICE);
  readonly #viewportWidth = signal<number>(this.#readViewportWidth());

  readonly dockRouteEligible = this.#dockRouteEligible.asReadonly();
  readonly openedByAutoOpen = this.#openedByAutoOpen.asReadonly();
  readonly panelOpen = this.#panelOpen.asReadonly();

  readonly dockMaxWidth: Signal<number> = computed(() => fzAssistantDockMaxWidth(this.#viewportWidth()));

  readonly dockMinWidth: number = FZ_ASSISTANT_DOCK_WIDTH_MIN;

  readonly dockWidth: Signal<number> = computed(() => clampFzAssistantDockWidth(this.#requestedDockWidth(), this.#viewportWidth()));

  canAutoOpen(): boolean {
    return this.#dockRouteEligible() && !this.#panelOpen() && !isFzAssistantDockDismissedForToday(this.#storage);
  }

  closePanel(): void {
    this.#panelOpen.set(false);
    this.#openedByAutoOpen.set(false);
    markFzAssistantDockDismissedForToday(this.#storage);
  }

  /**
   * Closes the panel WITHOUT recording the per-day dismissal, for closes the user did not ask for as
   * a dismissal — handing off to customer service, say. Auto-open stays available for the rest of the
   * day; use {@link closePanel} for a genuine user dismissal.
   */
  closePanelWithoutDismissal(): void {
    this.#panelOpen.set(false);
    this.#openedByAutoOpen.set(false);
  }

  openPanel(): void {
    this.#openedByAutoOpen.set(false);
    this.#panelOpen.set(true);
  }

  resetDockWidth(): void {
    this.#requestedDockWidth.set(FZ_ASSISTANT_DOCK_WIDTH_DEFAULT);
  }

  setDockRouteEligible(eligible: boolean): void {
    this.#dockRouteEligible.set(eligible);
    if (!eligible) {
      this.#panelOpen.set(false);
      this.#openedByAutoOpen.set(false);
    }
  }

  setDockWidth(width: number): void {
    const bounded: number = clampFzAssistantDockWidthToBounds(width);
    if (this.#isCapEchoedBack(bounded)) {
      return;
    }

    this.#requestedDockWidth.set(bounded);
  }

  syncViewportWidth(): void {
    this.#viewportWidth.set(this.#readViewportWidth());
  }

  togglePanel(): void {
    this.#panelOpen.update((open: boolean) => {
      if (open) {
        this.#openedByAutoOpen.set(false);
        markFzAssistantDockDismissedForToday(this.#storage);
      }
      return !open;
    });
  }

  /**
   * Opens the dock once per calendar day when landing on a dock-eligible route
   * (and auto-open is allowed / not opted out). No-ops if the dock is ineligible, already open,
   * or the user closed it earlier today.
   */
  tryAutoOpen(): boolean {
    if (!this.canAutoOpen()) {
      return false;
    }

    this.#openedByAutoOpen.set(true);
    this.#panelOpen.set(true);
    return true;
  }

  #isCapEchoedBack(bounded: number): boolean {
    const cap: number = this.dockMaxWidth();
    return bounded >= cap && this.#requestedDockWidth() > cap;
  }

  #readViewportWidth(): number {
    return this.#document.defaultView?.innerWidth ?? Number.POSITIVE_INFINITY;
  }
}
