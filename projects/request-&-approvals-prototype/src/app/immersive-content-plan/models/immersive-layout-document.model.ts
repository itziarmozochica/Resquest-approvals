// `null` is a domain value here, not an absent one: the backend schema allows `null` as a valid
// enum member on some fields.
export type ImmersiveLayoutValue = string | number | boolean | null | ImmersiveLayoutValue[] | { [key: string]: ImmersiveLayoutValue };

export type ImmersiveLayoutProps = Record<string, ImmersiveLayoutValue>;

export type ImmersiveLayoutVisibility = Record<string, ImmersiveLayoutValue>;

export interface ImmersiveLayoutModule {
  id: string;
  props: ImmersiveLayoutProps;
  // Deliberately `string`, not a union: an unrecognized type must be preserved, not fail to parse.
  type: string;
  navbarLabelKey?: string;
  visibility?: ImmersiveLayoutVisibility;
}

export interface ImmersiveLayoutSchema {
  modules: ImmersiveLayoutModule[];
  // `channelId -> baseModuleId -> variant` (same id and type as its base). Absent, never empty, without variants.
  channel_overrides?: Record<string, Record<string, ImmersiveLayoutModule>>;
  theme_id?: number;
  venue_svg_url?: string | null;
  zone_selector_png_url?: string | null;
}

export type ImmersiveLayoutTranslations = Record<string, Record<string, string>>;

export interface ImmersiveLayoutDocument {
  // Sorted alphabetically by the backend, so the first entry is not necessarily English.
  available_languages: string[];
  // The locale the copy was authored in, one of the `translations` keys. `null` or absent on a layout saved before the backend stored it.
  base_locale?: string | null;
  schema: ImmersiveLayoutSchema;
  translations: ImmersiveLayoutTranslations;
  landing_config?: ImmersiveLayoutValue;
  updated_at?: string;
}
