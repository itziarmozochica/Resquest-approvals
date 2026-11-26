import type { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';

export type FieldKind = 'boolean' | 'enum' | 'number' | 'string' | 'token' | 'url';

export type ImmersivePlanAudience = 'non-waitlist' | 'waitlist';

/**
 * `kind: 'number'` means a positive integer: anything else clears the field.
 *
 * Every `*Key` is an i18n key suffix under `planEdition.immersiveContentPlan`.
 */
export interface FieldDescriptor {
  kind: FieldKind;
  enumValues?: readonly (string | null)[];
  // Shown only while this Optimizely flag is on; the stored value is kept either way.
  featureFlag?: FeatureFlags;
  helperKey?: string;
  // The value a new array row is seeded with; the only way a hidden field gets a key.
  initialValue?: string | boolean | null;
  // Kept in the contract but never shown or validated; do not combine with `required`.
  isHidden?: boolean;
  // i18n key suffix under `planEdition.immersiveContentPlan`. Defaults to `fields.<name>`, so this
  // is only needed when several fields share one copy or the field name is not a usable key.
  labelKey?: string;
  /**
   * Marks a `kind: 'url'` field that must load as browser-renderable media, so the probe checks it
   * as an image, a video, or tries image-then-video for `'any'`. A url field left unset is a link.
   */
  media?: 'image' | 'video' | 'any';
  // Names a sibling field on the same item whose stored value ('image' | 'video' | null) decides
  // the probe kind instead of the `'any'` image-then-video guess, so a typed media item never
  // pays for two requests when the type is already known.
  mediaKindField?: string;
  multiline?: boolean;
  // An emptied input drafts `null` instead of `''`; the key stays in the document, unlike `omitWhenEmpty`.
  nullWhenEmpty?: boolean;
  /**
   * The list guides the dropdown without closing the contract: the backend prop is a plain nullable
   * string and the list is only documented guidance, so a stored value outside it is valid data.
   *
   * Publish validation then skips the membership check — enforcing a rule the backend does not have
   * would block republishing layouts it accepts — and the field view keeps the stored value as a
   * selected option so editing the module never silently swaps it for a listed one.
   *
   * Requiredness is unaffected: openness is about which values are allowed, not about presence.
   */
  openEnum?: boolean;
  // A cleared (`null`) draft deletes the document key instead of writing `null`. Only for fields
  // where absence is the empty state — on an enum, `null` is a domain value.
  omitWhenEmpty?: boolean;
  placeholderKey?: string;
  // A switch with the input on its right: on while the field has a value, off clears it.
  isSwitchable?: boolean;
  /**
   * Marks the field as a publish blocker: the publish validator reports `missing_value` when the
   * field has no usable value, and the module gap badge counts that error.
   *
   * Every prop in `planview_layout_schema.py` is nullable except `immersive-logos` items, so
   * elsewhere requiredness is our own product rule and this registry is its only source of truth.
   */
  required?: boolean;
  // A multiline token edited with the restricted markdown editor (bold, italic, lists) instead of a
  // textarea. Opt-in per field: the renderer of every other multiline field stays plain text.
  richText?: boolean;
  /** Shown only to that plan audience; the stored value is kept either way. */
  visibleFor?: ImmersivePlanAudience;
  /**
   * Module-level fields only: shown while the sibling module prop `field` equals `equals`, with an
   * absent prop read as `null`. An `equals` other than `null` therefore hides the field while the
   * sibling is unset. A hidden field is skipped by the editor, the publish validation and the
   * translation gaps; its stored value is kept either way.
   */
  visibleWhen?: FieldVisibilityCondition;
}

export interface FieldVisibilityCondition {
  equals: string | null;
  field: string;
}

export interface ModuleArrayDescriptor {
  // One optional level of child array groups nested inside every row of this array (e.g. a lineup
  // item's own `subitems`). A child's `path` is relative to the row it lives on, not to the
  // module's props: `items[].subitems[]` declares `path: 'subitems'` on the child, never
  // `'items.subitems'`. `parseModulePropPath` and `findArrayDescriptor` are what resolve a child
  // back to the row it belongs to at read time.
  arrays?: ModuleArrayDescriptor[];
  // Declaration order is the editor's field order: the descriptive field of the item leads.
  fields: Record<string, FieldDescriptor>;
  // i18n key suffix for the group heading under planEdition.immersiveContentPlan.
  labelKey: string;
  // Prop path of the array inside the module props (e.g. 'items', 'media.desktop'), or, for a child
  // group, the path of the array relative to the row it lives on (e.g. 'subitems').
  path: string;
  // Mirrors the backend's `minItems` on this array; Remove is blocked at the floor.
  minItems?: number;
  unsupportedItemKinds?: readonly string[];
}

export interface ModuleDescriptor {
  label: string;
  arrays?: ModuleArrayDescriptor[];
  fields?: Record<string, FieldDescriptor>;
  // Mirrors the backend's `props_required=True`: its schema rejects a missing required value on
  // every write, so those errors block a draft save too, not only a publish.
  propsRequired?: boolean;
}
