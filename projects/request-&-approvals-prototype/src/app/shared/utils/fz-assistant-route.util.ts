import { ActivatedRouteSnapshot } from '@angular/router';

import {
  FZ_ASSISTANT_DOCK_AUTO_OPEN_ROUTE_DATA_KEY,
  FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY,
  FZ_ASSISTANT_PROMPT_CONTEXT_ROUTE_DATA_KEY,
  FzAssistantDockRouteDataValue,
  FzAssistantPromptContextId,
} from '../models/fz-assistant/fz-assistant-route-data.model';

function isFzAssistantPromptContextId(value: unknown): value is FzAssistantPromptContextId {
  return value === 'reviews' || value === 'dashboard-builder';
}

/**
 * Walks the activated route tree and returns whether dock auto-open is allowed.
 * Defaults to `true` when unset (auto-open wherever the dock is eligible, still gated by the FF).
 * A child `false` can opt a route out.
 */
export function getFzAssistantDockAutoOpenFromRouteSnapshot(root: ActivatedRouteSnapshot): boolean {
  let result = true;

  const walk = (snapshot: ActivatedRouteSnapshot | null): void => {
    if (snapshot === null) {
      return;
    }

    const value: unknown = snapshot.data[FZ_ASSISTANT_DOCK_AUTO_OPEN_ROUTE_DATA_KEY];
    if (value === true || value === false) {
      result = value;
    }

    walk(snapshot.firstChild);
  };

  walk(root);
  return result;
}

/**
 * Walks the activated route tree and returns the last defined `fzAssistantDock` value
 * (child routes can override a parent value). When undefined, layout treats the dock as enabled
 * on desktop; only `'off'` opts out.
 */
export function getFzAssistantDockFromRouteSnapshot(root: ActivatedRouteSnapshot): FzAssistantDockRouteDataValue | undefined {
  let result: FzAssistantDockRouteDataValue | undefined;

  const walk = (snapshot: ActivatedRouteSnapshot | null): void => {
    if (snapshot === null) {
      return;
    }

    const value: unknown = snapshot.data[FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY];
    if (value === 'right' || value === 'off') {
      result = value;
    }

    walk(snapshot.firstChild);
  };

  walk(root);
  return result;
}

/**
 * Walks the activated route tree and returns the last defined `fzAssistantPromptContext` value
 * (child routes can override a parent value).
 */
export function getFzAssistantPromptContextFromRouteSnapshot(root: ActivatedRouteSnapshot): FzAssistantPromptContextId | undefined {
  let result: FzAssistantPromptContextId | undefined;

  const walk = (snapshot: ActivatedRouteSnapshot | null): void => {
    if (snapshot === null) {
      return;
    }

    const value: unknown = snapshot.data[FZ_ASSISTANT_PROMPT_CONTEXT_ROUTE_DATA_KEY];
    if (isFzAssistantPromptContextId(value)) {
      result = value;
    }

    walk(snapshot.firstChild);
  };

  walk(root);
  return result;
}
