/**
 * The query param carrying the language an embedded dashboard is read in.
 *
 * The portal cannot work it out for itself: served from another origin, all it can see is its own
 * `localStorage` and the browser locale, and neither is the language the partner chose in Feverzone.
 *
 * It goes in the URL for the same reason the theme does — the portal's route is server-rendered, so
 * the language has to be known before the first paint, and a `postMessage` would arrive after the
 * dashboard had been drawn in the wrong one. Changing it therefore means recreating the iframe.
 *
 * Shared contract with `data-insights-portal-client` (`i18n.tokens.ts`), whose supported set this
 * app's `SUPPORTED_LANGUAGES` mirrors. A tag the portal does not ship degrades to English there.
 */
export const INSIGHTS_EMBED_LANGUAGE_QUERY_PARAM = 'lang';
