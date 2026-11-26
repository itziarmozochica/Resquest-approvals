import { EventEmitter, inject, Injectable, TemplateRef, untracked } from '@angular/core';

import { IgntToastService, type IgntToastConfig, type IgntToastRef, type IgntToastSentiment } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * @deprecated Use the `sentiment` property (`IgntAlertSentiment`) instead.
 * Legacy enum for ng-bootstrap toast. Will be removed.
 */
export enum ToastType {
  ERROR = 'error',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
}

/**
 * @deprecated Use `Toast` instead. ToastLegacy will be removed.
 */
export interface ToastLegacy {
  id: string;
  type: ToastType;
  autoHide?: boolean;
  delay?: number;
  message?: string;
  messageTemplate?: TemplateRef<unknown>;
  title?: string;
  titleTranslationKey?: string;
  translationKey?: string;
}

export interface Toast {
  id: string;
  actionLabel?: string;
  autoHide?: boolean;
  contrast?: boolean;
  delay?: number;
  message?: string;
  messageTemplate?: TemplateRef<unknown>;
  sentiment?: IgntToastSentiment;
  title?: string;
  actionClicked?: () => void;
}

const LEGACY_DEFAULT_DURATION_MS = 10_000;

const SENTIMENT_BY_TOAST_TYPE: Record<ToastType, IgntToastSentiment> = {
  [ToastType.ERROR]: 'danger',
  [ToastType.INFO]: 'info',
  [ToastType.SUCCESS]: 'positive',
  [ToastType.WARNING]: 'warning',
};

type AddToastInput = (Omit<Toast, 'id'> & { id?: string }) | (Omit<ToastLegacy, 'id'> & { id?: string });

interface ToastEntry {
  ref: IgntToastRef;
  toast: Toast | ToastLegacy;
}

/**
 * @deprecated Use `IgntToastService` from `@ignite/common`. This class only forwards to it, and every call site is
 * being migrated file by file; see
 * projects/workspace-lint/deprecations/angular/legacy-toast-service/migration.md.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly #igntToastService = inject(IgntToastService);
  // Only the `translationKey` / `titleTranslationKey` legacy toasts need it, and the root app always provides it.
  // Optional so that pulling this deprecated adapter in transitively — which a component spec does without ever
  // mentioning a toast — does not force every such spec to provide `TranslateService`.
  readonly #translateService = inject(TranslateService, { optional: true });
  // One entry per live toast, pairing the caller's own record with the ref the design system handed back. The
  // ref resolves `remove(id)`, because `IgntToastService` generates ids of its own; the record keeps
  // `toastsList$` and `hasActiveToastWithMessage` answering exactly what they answered before.
  #entries: ToastEntry[] = [];
  // ponytail: no production consumer left, only spec stubs — it survives so the legacy API does not break, and it
  // drags `#entries`, `#forgetDismissed()` and `#toasts()` with it. `hasActiveToastWithMessage()` is the last thing
  // that needs them, with one caller (`authentication.interceptor.ts`). Move that caller to
  // `IgntToastService.toasts()` and all four go, along with a predicate that prunes state and emits as a side effect.
  toastsList$: EventEmitter<(Toast | ToastLegacy)[]> = new EventEmitter<(Toast | ToastLegacy)[]>();

  /**
   * Add a toast notification using the new ignt-alert design.
   */
  add(toast: Omit<Toast, 'id'> & { id?: string }): void;
  /**
   * @deprecated Use `Toast` with `sentiment` configuration instead of ToastLegacy with `type`. Legacy Toast will be removed.
   */
  add(toast: Omit<ToastLegacy, 'id'> & { id?: string }): void;
  add(toast: AddToastInput): void {
    this.#forgetDismissed();
    const ref = this.#igntToastService.show(this.#toConfig(toast));
    const actionClicked = 'actionClicked' in toast ? toast.actionClicked : undefined;
    if (actionClicked !== undefined) {
      // `onAction()` completes with the toast, so this subscription ends on its own.
      ref.onAction().subscribe(actionClicked);
    }
    this.#entries = [...this.#entries, { ref, toast: { ...toast, id: toast.id ?? uuidv4() } as Toast | ToastLegacy }];
    this.toastsList$.emit(this.#toasts());
  }

  /**
   * Raise an error toast. Lets callers show a danger toast without naming the
   * sentiment themselves.
   */
  addError(message: string): void {
    this.add({ message, sentiment: 'danger' });
  }

  /**
   * Raise an auto-hiding success toast. Lets callers show a positive toast without
   * naming the sentiment themselves.
   */
  addSuccess(message: string, title?: string): void {
    this.add({ autoHide: true, message, sentiment: 'positive', title });
  }

  /**
   * Raise a warning toast. Same reason as `addSuccess`: callers need not name the sentiment.
   */
  addWarning(message: string): void {
    this.add({ message, sentiment: 'warning' });
  }

  clear(): void {
    // Only the toasts this adapter raised. `dismissAll()` would also take out toasts raised straight through
    // `IgntToastService` by already-migrated code, which no caller of `clear()` ever asked for.
    this.#entries.forEach(({ ref }) => {
      ref.dismiss();
    });
    this.#entries = [];
    this.toastsList$.emit(this.#toasts());
  }

  hasActiveToastWithMessage(message: string): boolean {
    this.#forgetDismissed();

    return this.#entries.some(entry => entry.toast.message === message);
  }

  remove(toastId: string): void {
    for (const entry of this.#entries.filter(({ toast }) => toast.id === toastId)) {
      entry.ref.dismiss();
    }
    this.#entries = this.#entries.filter(({ toast }) => toast.id !== toastId);
    this.toastsList$.emit(this.#toasts());
  }

  // A toast that timed out or was dismissed by the user leaves the design system's list without telling us.
  #forgetDismissed(): void {
    // `add()` reaches here, and raising a toast is a side effect that callers legitimately perform from inside an
    // `effect`. Reading `toasts()` tracked would make the design system's list a dependency of that caller, and
    // the `show()` below would then re-trigger it forever — synchronously, so it hangs rather than fails.
    const liveIds = untracked(() => new Set(this.#igntToastService.toasts().map(toast => toast.id)));
    const liveEntries = this.#entries.filter(({ ref }) => liveIds.has(ref.id));
    if (liveEntries.length === this.#entries.length) {
      return;
    }
    this.#entries = liveEntries;
    this.toastsList$.emit(this.#toasts());
  }

  #toasts(): (Toast | ToastLegacy)[] {
    return this.#entries.map(({ toast }) => toast);
  }

  #toConfig(toast: AddToastInput): IgntToastConfig {
    // `ToastComponent.defaultDelay` was 10s and every call site was written against it, so an unset `delay` keeps
    // that rather than falling through to the design system's own 4s / 7s defaults. Migrating a call site off this
    // adapter is where a toast adopts the shorter timing, deliberately and one file at a time.
    const duration = toast.autoHide === false ? Infinity : (toast.delay ?? LEGACY_DEFAULT_DURATION_MS);

    if ('type' in toast) {
      const shared = {
        duration,
        sentiment: SENTIMENT_BY_TOAST_TYPE[toast.type],
        title: toast.title ?? this.#translate(toast.titleTranslationKey),
      };

      return toast.messageTemplate === undefined
        ? { ...shared, description: toast.message ?? this.#translate(toast.translationKey) ?? '' }
        : { ...shared, content: toast.messageTemplate };
    }

    const shared = { actionLabel: toast.actionLabel, duration, sentiment: toast.sentiment, title: toast.title };
    if (toast.messageTemplate !== undefined) {
      return { ...shared, content: toast.messageTemplate };
    }

    return { ...shared, description: toast.message ?? '' };
  }

  // Resolved here rather than left for the card to translate: keeping the key would put a translation dependency
  // in the design system, and this adapter is the thing being deleted. A toast raised before i18n has loaded shows
  // the key — the legacy `| translate` pipe would have shown it too, then corrected itself.
  #translate(key: string | undefined): string | undefined {
    if (key === undefined) {
      return undefined;
    }

    return this.#translateService === null ? key : this.#translateService.instant(key);
  }
}
