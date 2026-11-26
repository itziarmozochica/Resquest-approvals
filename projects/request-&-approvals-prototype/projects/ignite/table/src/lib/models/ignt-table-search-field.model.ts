/** Toolbar search:
 * interface that allows your table to be searchable by a value.
 * @property searchQuery - The search query.
 * @property isDisabled - Whether the search input field is disabled.
 * @property isVisible - Whether the search input field is visible.
 */
export interface IgntTableSearchConfig {
  readonly searchQuery: string;
  readonly isDisabled?: boolean;
  readonly isVisible?: boolean;
}
