export interface TabItem {
  id: string;
  label: string;
  /** Rich text (HTML). */
  body: string;
  contentTitle: string;
  imageSrc: string;
}

export interface TabsProps {
  tabBarColor: string;
  tabs: TabItem[];
  /**
   * Session-only UI state: which tab is currently focused inside the editor.
   * The DTO counterpart `TabsPropsDTO` (in `tabs.dto.ts`) intentionally does
   * not have this field, which is how the "never-persisted" contract is
   * enforced by the type system. On load the adapter re-initialises this to 0.
   */
  activeIndex: number;
}
