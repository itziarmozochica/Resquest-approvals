import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { FzAssistantCapturedViewContext } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-captured.model';
import {
  FzAssistantCaptureConfig,
  FzAssistantDescribeViewBuildResult,
  FzAssistantDiscoverFacade as FzAssistantDiscoverFacadeContract,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';
import { FzAssistantHostConfig, FzAssistantRegisteredHost } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-host.model';
import {
  DescribeViewArgs,
  FzAssistantHostAction,
  FzAssistantViewContext,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-wire.model';
import { serializeViewContext } from '@fz-original/app/shared/utils/fz-assistant/fz-assistant-view-context-serializer.util';

import { FzAssistantHostRegistryService } from '../host/fz-assistant-host-registry.service';
import { FZ_ASSISTANT_CAPTURE_CONFIG, FzAssistantCaptureService } from './fz-assistant-capture.service';

interface ResolvedCaptureTarget {
  element: Element;
  config: FzAssistantHostConfig | null;
  /** When false, capture only the resolved subtree (CSS scope) — do not append overlay roots. */
  includeOverlays: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FzAssistantDiscoverFacade implements FzAssistantDiscoverFacadeContract {
  readonly #capture = inject(FzAssistantCaptureService);
  readonly #config: FzAssistantCaptureConfig = inject(FZ_ASSISTANT_CAPTURE_CONFIG);
  readonly #document = inject(DOCUMENT);
  readonly #hostRegistry = inject(FzAssistantHostRegistryService);
  readonly #router = inject(Router);

  /**
   * Route and title only - the §3.4 "no capture" shape, and the one build here that cannot fail.
   *
   * `elements` is omitted rather than emptied: an omission reads as "no capture ran", where `[]` reads as
   * "captured, and this screen has no interactives". Callers that owe a `view_context` whatever happens
   * fall back to this; nothing in it touches feature-owned code, so nothing in it can throw.
   */
  buildBaselineViewContext(): FzAssistantViewContext {
    return {
      route: this.#router.url,
      title: this.#document.title,
    };
  }

  /**
   * Convenience unwrap of {@link tryBuildViewContext} for chat-init / callers that never pass a
   * failing scope. Prefer `tryBuildViewContext` for `describe_view` so `no_match` is not lost.
   */
  buildViewContext(options?: DescribeViewArgs): FzAssistantViewContext {
    const result = this.tryBuildViewContext(options);
    if (result.ok === false) {
      throw new Error(result.hint);
    }
    return result.viewContext;
  }

  /**
   * Chat send / init: always attach a `view_context` when Discover is on.
   * No active host → `{ route, title }` only (omit `elements` so we do not claim “no interactives”).
   * Active host → full capture; `elements: []` then means the host was captured and found nothing.
   */
  buildViewContextForSend(): FzAssistantViewContext {
    if (this.#hostRegistry.getActiveHost() === null) {
      return this.buildBaselineViewContext();
    }

    return this.buildViewContext();
  }

  tryBuildViewContext(options?: DescribeViewArgs): FzAssistantDescribeViewBuildResult {
    const route = this.#router.url;
    const title = this.#document.title;
    const trimmedScope = options?.scope?.trim() ?? '';
    const target = this.#resolveCaptureTarget(options?.scope);

    if (target === null) {
      // Explicit view-id / CSS scope that resolved to nothing — fail so the agent can correct itself.
      // Omit / empty / `"current"` with no host stays success + baseline (non-instrumented page, study §4.9).
      if (!isFullViewDescribeScope(options?.scope)) {
        return {
          error: 'no_match',
          hint: `describe_view scope "${trimmedScope}" did not match a view id or connected DOM element`,
          ok: false,
        };
      }

      return {
        ok: true,
        viewContext: serializeViewContext({
          route,
          title,
          elements: [],
        }),
      };
    }

    const roots = target.includeOverlays ? this.#capture.resolveRoots(target.element) : [target.element];
    const capture: FzAssistantCapturedViewContext = {
      route,
      title,
      elements: this.#capture.capture(roots),
      ...(target.config !== null ? this.#readHostFields(target.config) : {}),
    };

    return {
      ok: true,
      viewContext: serializeViewContext(capture),
    };
  }

  #readHostFields(config: FzAssistantHostConfig): Pick<FzAssistantCapturedViewContext, 'view' | 'view_state' | 'form_valid' | 'actions'> {
    const viewState = config.viewState?.();
    // Read submitEnabled once so form_valid and the submit action cannot disagree on an impure callback.
    const formValid = config.submitEnabled?.();
    const actions = mapHostActions(config, formValid);

    return {
      view: config.viewId,
      ...(viewState !== undefined ? { view_state: viewState } : {}),
      ...(formValid !== undefined ? { form_valid: formValid } : {}),
      ...(actions !== undefined ? { actions } : {}),
    };
  }

  #resolveCaptureTarget(scope?: string): ResolvedCaptureTarget | null {
    const activeHost = this.#hostRegistry.getActiveHost();
    const trimmedScope = scope?.trim() ?? '';

    // Omit / empty / `"current"` → active host (+ overlays). `"current"` is a BE/agent alias for all.
    if (isFullViewDescribeScope(scope)) {
      return toCaptureTarget(activeHost);
    }

    if (activeHost !== null && activeHost.config.viewId === trimmedScope) {
      return toCaptureTarget(activeHost);
    }

    const scopedElement = queryScopeElement(this.#document, trimmedScope);
    if (scopedElement === null || !scopedElement.isConnected) {
      return null;
    }

    // CDK/ngb portals sit under body, not the host element, so overlay membership is
    // treated like host ownership for scoped describe (same assumption as resolveRoots).
    // Screen-owned dialogs/selects/tooltips are the intended case. A truly global overlay
    // unrelated to the active host is a rare edge case V1 does not try to detect.
    if (
      activeHost !== null &&
      (belongsToActiveHost(activeHost.element, scopedElement) || isInsideOverlayRoot(scopedElement, this.#config.overlayRootSelectors))
    ) {
      return {
        element: scopedElement,
        config: activeHost.config,
        includeOverlays: false,
      };
    }

    return {
      element: scopedElement,
      config: null,
      includeOverlays: false,
    };
  }
}

/** Omit, whitespace, or `"current"` (case-insensitive) = capture the full active host. */
function isFullViewDescribeScope(scope?: string): boolean {
  const trimmed = scope?.trim() ?? '';
  return trimmed === '' || trimmed.toLowerCase() === 'current';
}

function belongsToActiveHost(hostElement: Element, scopedElement: Element): boolean {
  return hostElement === scopedElement || hostElement.contains(scopedElement);
}

function isInsideOverlayRoot(element: Element, overlayRootSelectors: readonly string[]): boolean {
  for (const selector of overlayRootSelectors) {
    if (selector.trim() === '') {
      continue;
    }

    try {
      if (element.closest(selector) !== null) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

function toCaptureTarget(host: FzAssistantRegisteredHost | null): ResolvedCaptureTarget | null {
  if (host === null || !host.element.isConnected) {
    return null;
  }

  return {
    element: host.element,
    config: host.config,
    includeOverlays: true,
  };
}

function queryScopeElement(documentRef: Document, scope: string): Element | null {
  try {
    return documentRef.querySelector(scope);
  } catch {
    return null;
  }
}

function mapHostActions(config: FzAssistantHostConfig, formValid: boolean | undefined): FzAssistantHostAction[] | undefined {
  const confirmationRequired = config.requireConfirmationFor;

  const triggerActions: FzAssistantHostAction[] =
    config.actions === undefined ? [] : Object.keys(config.actions).map(id => toHostAction(id, confirmationRequired));

  const submitAction: FzAssistantHostAction | undefined =
    config.submit === undefined
      ? undefined
      : formValid === undefined
        ? toHostAction('submit', confirmationRequired)
        : formValid
          ? { ...toHostAction('submit', confirmationRequired), enabled: true }
          : { ...toHostAction('submit', confirmationRequired), enabled: false, disabled_reason: 'form_invalid' };

  const actions = submitAction === undefined ? triggerActions : [...triggerActions, submitAction];

  return actions.length > 0 ? actions : undefined;
}

function toHostAction(id: string, confirmationRequired: ReadonlySet<string> | undefined): FzAssistantHostAction {
  // Advisory Discover hint only — Act must enforce requireConfirmationFor (see host model JSDoc).
  if (confirmationRequired?.has(id) === true) {
    return { id, requires_confirmation: true };
  }

  return { id };
}
