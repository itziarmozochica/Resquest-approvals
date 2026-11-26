import { Data } from '@angular/router';

/** Route `data` key for Fz Assistant right-dock shell. Default is dock-on when unset; use `'off'` to opt out. */
export const FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY = 'fzAssistantDock' as const;

/**
 * Route `data` key for dock auto-open. Defaults to on when unset (still gated by
 * `enable_chatbot_automatic_opening`). Set `false` to opt a route out.
 */
export const FZ_ASSISTANT_DOCK_AUTO_OPEN_ROUTE_DATA_KEY = 'fzAssistantDockAutoOpen' as const;

export const FZ_ASSISTANT_PROMPT_CONTEXT_ROUTE_DATA_KEY = 'fzAssistantPromptContext' as const;

export type FzAssistantDockRouteDataValue = 'off' | 'right';

export type FzAssistantPromptContextId = 'reviews' | 'dashboard-builder';

export type FzAssistantRouteData = Data & {
  [FZ_ASSISTANT_DOCK_AUTO_OPEN_ROUTE_DATA_KEY]?: boolean;
  [FZ_ASSISTANT_DOCK_ROUTE_DATA_KEY]?: FzAssistantDockRouteDataValue;
  [FZ_ASSISTANT_PROMPT_CONTEXT_ROUTE_DATA_KEY]?: FzAssistantPromptContextId;
};
