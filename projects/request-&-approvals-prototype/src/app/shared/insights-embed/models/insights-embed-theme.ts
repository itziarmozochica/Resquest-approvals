/**
 * The visual variant an embedded dashboard paints in, named the way the portal names it.
 *
 * The portal reads it from a `?theme=` query param **off the route snapshot** and falls back to
 * `'dark'` for a missing or unknown value, in silence — it will not fail a report over a typo in a
 * query string. Two consequences for a host:
 *
 * - it goes in the **URL**, never in a `postMessage`: the route is server-rendered, so the variant has
 *   to be known before the first paint;
 * - changing it means **recreating the iframe**, because a snapshot is read once.
 *
 * Shared contract with `data-insights-portal-client` (`real-time-theme.model.ts`) — renaming either
 * side breaks the other silently.
 */
export type InsightsEmbedTheme = 'dark' | 'light';

/** The query param the host puts the variant in. */
export const INSIGHTS_EMBED_THEME_QUERY_PARAM = 'theme';
