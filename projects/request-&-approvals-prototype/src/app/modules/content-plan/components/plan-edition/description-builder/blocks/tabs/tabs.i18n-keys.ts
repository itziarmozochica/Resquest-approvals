const KEY_PREFIX = 'planEdition.contentEdition.builder.blocks.tabs.';

/** Tabs-only i18n keys (shared ones live in `_shared/shared.i18n-keys.ts`). */
export const TABS_I18N = {
  activeTab: `${KEY_PREFIX}activeTab`,
  addTabAria: `${KEY_PREFIX}addTabAria`,
  componentLabel: `${KEY_PREFIX}componentLabel`,
  deleteTab: `${KEY_PREFIX}deleteTab`,
  /** Expandable rich-text modal title for the tab body. */
  editBody: `${KEY_PREFIX}editBody`,
  /** The per-tab "Label" field label. */
  label: `${KEY_PREFIX}label`,
  sectionHeading: `${KEY_PREFIX}sectionHeading`,
  sectionHeadingPlaceholder: `${KEY_PREFIX}sectionHeadingPlaceholder`,
  tabBarColor: `${KEY_PREFIX}tabBarColor`,
  tabContent: `${KEY_PREFIX}tabContent`,
  /** Interpolated "Tab {{index}}" — label placeholder AND group header. */
  tabLabel: `${KEY_PREFIX}tabLabel`,
} as const;
