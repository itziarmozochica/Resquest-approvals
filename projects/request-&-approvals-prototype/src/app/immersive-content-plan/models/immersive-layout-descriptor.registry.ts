// Manual mirror of data-railway `infrastructure/planview_layout/planview_layout_schema.py`.
// That file wins over any other document whenever they disagree.
//
// Field declaration order is load-bearing: `collectModuleFields` emits fields in the order they are
// declared and the editor renders them in that order; the accordion header is the first single-line
// token wherever it sits. An alphabetical sort silently reorders the UI, so the perfectionist rule stays off for this file.
/* eslint-disable perfectionist/sort-objects */

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';

import { GENERAL_SETTINGS_ID } from './immersive-content-plan-editor.model';
import type { FieldVisibilityCondition, ModuleDescriptor } from './immersive-layout-descriptor.model';
import type { ImmersiveModuleType } from './immersive-layout-module-type.model';
import { immersiveModuleTypes } from './immersive-layout-module-type.model';

// The section header is not a special descriptor kind: it is two ordinary dotted fields spread
// into the descriptors that carry one, so every field travels the same collect/view/patch path.
const sectionHeaderFields = {
  'header.overline': { kind: 'token' as const, labelKey: 'fields.overline' },
  'header.title': { kind: 'token' as const, labelKey: 'fields.title' },
};

const customTemplateOnly: FieldVisibilityCondition = { equals: 'custom', field: 'template' };

// The page ignores `header.overline` on most modules and prints its own i18n overline instead, so
// those descriptors declare the title only; the stored overline still round-trips untouched.
const titleOnlyHeaderFields = {
  'header.title': sectionHeaderFields['header.title'],
};

// HERO_ITEM_ICONS in the backend schema, declaration order preserved.
const heroItemIcons: readonly (string | null)[] = [
  'clock',
  'drone',
  'wand',
  'user-plus',
  'moon',
  'star-shooting',
  'candle-holder',
  'calendar',
  'building',
  'church',
  'music',
  'puzzle-piece',
  'shapes',
  'users',
  'knife-kitchen',
  'shoe-prints',
  'saxophone',
  'hat-wizard',
  'rabbit',
  'martini-glass-citrus',
  'door-closed',
  'door-open',
  'globe',
  'violin',
  'piano',
  'list-music',
  'microphone-lines',
  'trumpet',
  null,
];

// VENUE_ITEM_ICONS in the backend schema, declaration order preserved.
//
// Unlike HERO_ITEM_ICONS this is NOT a schema enum: `immersiveVenueProps.icon` and
// `immersiveLinksProps.icon` are both plain nullable strings, and the backend documents the gap —
// tightening the schema would reject layouts already stored with other icons. So this list guides
// the choice without closing it: `buildFieldShell` keeps any stored value outside it as an extra
// option, and links reuses the same catalogue because the schema declares none of its own.
// `openEnum` is what keeps this a suggestion: the publish validator accepts icons outside the list,
// so offering it can never block a layout the backend would take. One shared object, because links
// literally reuses venue's catalogue rather than declaring a parallel one that could drift.
const venueItemIconField = {
  enumValues: ['location-dot', 'circle-parking', 'wheelchair', null] as readonly (string | null)[],
  kind: 'enum' as const,
  openEnum: true,
};

// heroMediaItem in the backend schema: {src, type, alt, poster}, all nullable.
// Field declaration order is the editor's field order: the descriptive field leads each item,
// the rest stay alphabetical.
const heroMediaItemFields = {
  // `mediaKindField` names the sibling `type` field below: a typed item is probed as exactly that
  // kind, and only a null-typed item still pays for the image-then-video `'any'` guess.
  src: { kind: 'url' as const, media: 'any' as const, mediaKindField: 'type' },
  alt: { kind: 'string' as const },
  poster: { kind: 'url' as const, media: 'image' as const },
  type: { enumValues: ['image', 'video', null], kind: 'enum' as const },
};

const immersiveDescriptors: Record<ImmersiveModuleType, ModuleDescriptor> = {
  'immersive-artists': {
    fields: { ...sectionHeaderFields },
    label: 'Artists',
  },
  // A banner without a template is the preset: only `template` shows, and the custom fields appear
  // once it is `custom`. `null` stays a listed member so a stored `template: null` still renders.
  'immersive-campaign-banner': {
    fields: {
      template: { enumValues: ['campaign-preset', 'custom', null], kind: 'enum' },
      alt: { kind: 'token', visibleWhen: customTemplateOnly },
      imageUrl: { kind: 'url', media: 'image', visibleWhen: customTemplateOnly },
      imageUrlDesktop: { kind: 'url', media: 'image', visibleWhen: customTemplateOnly },
      openInNewTab: { kind: 'boolean', visibleWhen: customTemplateOnly },
      url: { kind: 'url', visibleWhen: customTemplateOnly },
    },
    label: 'Campaign banner',
  },
  'immersive-description': {
    arrays: [
      {
        fields: {
          text: { kind: 'token', multiline: true, richText: true },
          kind: { enumValues: ['text', 'html', 'image', null], initialValue: 'text', isHidden: true, kind: 'enum' },
        },
        labelKey: 'itemsHeading',
        path: 'items',
        unsupportedItemKinds: ['html', 'image'],
      },
    ],
    fields: { ...titleOnlyHeaderFields },
    label: 'Description',
  },
  'immersive-faqs': {
    arrays: [
      {
        fields: {
          question: { kind: 'token' },
          answer: { kind: 'token', multiline: true },
          expanded: { kind: 'boolean' },
        },
        labelKey: 'itemsHeading',
        path: 'items',
      },
    ],
    fields: { ...titleOnlyHeaderFields },
    label: 'FAQs',
  },
  'immersive-hero': {
    arrays: [
      {
        fields: {
          icon: { enumValues: heroItemIcons, kind: 'enum' },
          label: { kind: 'token' },
          value: { kind: 'token' },
        },
        labelKey: 'itemsHeading',
        path: 'items',
      },
      {
        fields: heroMediaItemFields,
        labelKey: 'mediaDesktopHeading',
        path: 'media.desktop',
      },
      {
        fields: heroMediaItemFields,
        labelKey: 'mediaMobileHeading',
        path: 'media.mobile',
      },
    ],
    fields: {
      // Paused product-side: kept in the contract (so an existing value is never deleted or
      // rewritten) but taken out of the editor entirely — see `FieldDescriptor.isHidden`.
      ctaDisabled: { isHidden: true, kind: 'boolean' },
      exclusiveIconSrc: { kind: 'url', media: 'image', omitWhenEmpty: true, isSwitchable: true },
      exclusiveIconSize: { enumValues: ['small', 'large', null], kind: 'enum' },
      isExclusive: { kind: 'boolean' },
      // Despite the name, a translatable string: the text shown in place of the date. Absent is off.
      isOpenEnded: {
        isSwitchable: true,
        kind: 'token',
        omitWhenEmpty: true,
        placeholderKey: 'openEndedPlaceholder',
        visibleFor: 'non-waitlist',
      },
      // Waitlist plans show this in place of the date, where `isOpenEnded` does not apply.
      waitlistDateText: {
        isSwitchable: true,
        kind: 'token',
        omitWhenEmpty: true,
        placeholderKey: 'waitlistDateTextPlaceholder',
        visibleFor: 'waitlist',
      },
    },
    label: 'Hero',
  },
  'immersive-highlights': {
    arrays: [
      {
        fields: {
          title: { kind: 'token' },
          description: { kind: 'token', multiline: true },
          image: { kind: 'url', media: 'image' },
        },
        labelKey: 'itemsHeading',
        path: 'items',
      },
    ],
    fields: { ...titleOnlyHeaderFields },
    label: 'Highlights',
  },
  'immersive-how-it-works': {
    arrays: [
      {
        fields: {
          image: { kind: 'url', media: 'image' },
          overline: { kind: 'token' },
          title: { kind: 'token' },
          description: { kind: 'token', multiline: true },
        },
        labelKey: 'itemsHeading',
        path: 'items',
      },
    ],
    fields: { ...titleOnlyHeaderFields },
    label: 'How it works',
  },
  // LINEUP_ITEM_KINDS in the backend schema, declaration order preserved.
  'immersive-lineup': {
    arrays: [
      {
        arrays: [
          {
            fields: {
              title: { kind: 'token' },
              subtitle: { kind: 'token' },
            },
            labelKey: 'subitemsHeading',
            path: 'subitems',
          },
        ],
        fields: {
          label: { kind: 'token' },
          kind: { enumValues: ['program-block', null], kind: 'enum' },
        },
        labelKey: 'itemsHeading',
        path: 'items',
      },
    ],
    fields: { ...titleOnlyHeaderFields },
    label: 'Program',
  },
  'immersive-links': {
    arrays: [
      {
        fields: {
          icon: venueItemIconField,
          label: { kind: 'token' },
          description: { kind: 'token' },
          value: { kind: 'url', labelKey: 'fields.url' },
        },
        labelKey: 'itemsHeading',
        path: 'items',
      },
    ],
    label: 'Links',
  },
  // immersiveLogosProps in the backend schema, product name "Sponsors": the only module with
  // `props_required=True`, so `items` has a `minItems: 1` floor. The backend still requires `height`
  // and `width`; the editor hides them (DR-313 drops them from the schema).
  'immersive-logos': {
    arrays: [
      {
        fields: {
          src: { kind: 'url', media: 'image', required: true },
          alt: { kind: 'string', required: true },
          height: { isHidden: true, kind: 'number' },
          width: { isHidden: true, kind: 'number' },
        },
        labelKey: 'itemsHeading',
        minItems: 1,
        path: 'items',
      },
    ],
    fields: { ...sectionHeaderFields },
    label: 'Sponsors',
    propsRequired: true,
  },
  // PERFORMERS_ITEM_ICONS in the backend schema, declaration order preserved.
  'immersive-performers': {
    arrays: [
      {
        fields: {
          label: { kind: 'token' },
          icon: { enumValues: ['piano', 'strings', 'brass', 'winds', 'vocals', 'mixed', 'other', null], kind: 'enum' },
          value: { kind: 'token' },
        },
        labelKey: 'itemsHeading',
        path: 'items',
      },
    ],
    fields: { helperText: { kind: 'token' } },
    label: 'Performers',
  },
  'immersive-photo': {
    fields: { ...titleOnlyHeaderFields },
    label: 'Photo gallery',
  },
  'immersive-similar': {
    fields: { ...titleOnlyHeaderFields },
    label: 'Similar plans',
  },
  'immersive-similar-plans': {
    fields: { ...titleOnlyHeaderFields },
    label: 'Similar plans',
  },
  'immersive-user-reviews': {
    fields: {
      ...titleOnlyHeaderFields,
      communityCaption: { kind: 'token' },
      'communityHeader.title': { kind: 'token', labelKey: 'fields.communitySectionTitle' },
      footerText: { kind: 'token' },
    },
    label: 'Reviews',
  },
  'immersive-venue': {
    arrays: [
      {
        fields: {
          value: { kind: 'token', multiline: true },
          icon: venueItemIconField,
          kind: { enumValues: ['location', 'parking', 'accessibility', 'bus', null], kind: 'enum' },
        },
        labelKey: 'itemsHeading',
        path: 'items',
      },
    ],
    label: 'Venue',
  },
  'immersive-well-performing-plans': {
    fields: { ...titleOnlyHeaderFields },
    label: 'Well performing plans',
  },
};

// A frontend-only pseudo-module: its fields live at `schema.<name>`, not inside a module's props.
// It has a descriptor so it travels the ordinary field pipeline — which is why
// `isSupportedModuleType(GENERAL_SETTINGS_ID)` is true even though no backend module carries it.
const generalSettingsDescriptor: ModuleDescriptor = {
  fields: {
    theme_id: { helperKey: 'themeHelper', kind: 'number', omitWhenEmpty: true, placeholderKey: 'themePlaceholder' },
    zone_selector_png_url: { helperKey: 'zoneMapPngHelper', kind: 'url', nullWhenEmpty: true, placeholderKey: 'zoneMapPngPlaceholder' },
    venue_svg_url: {
      featureFlag: FeatureFlags.IMMERSIVE_PLAN_LAYOUT_VENUE_SVG,
      helperKey: 'venueSvgHelper',
      kind: 'url',
      nullWhenEmpty: true,
      placeholderKey: 'venueSvgPlaceholder',
    },
  },
  label: 'General settings',
};

export function isImmersiveModuleType(type: string): type is ImmersiveModuleType {
  return (immersiveModuleTypes as readonly string[]).includes(type);
}

export function getDescriptor(type: string): ModuleDescriptor | undefined {
  if (type === GENERAL_SETTINGS_ID) {
    return generalSettingsDescriptor;
  }
  return isImmersiveModuleType(type) ? immersiveDescriptors[type] : undefined;
}

// The single "does the editor support this module" rule: landing-* and unknown types have no
// descriptor, so both read as unsupported without a second, family-based check anywhere.
export function isSupportedModuleType(type: string): boolean {
  return getDescriptor(type) !== undefined;
}

// Product-paused module types: still a real, published part of the document (data untouched, kept
// in `layout.schema.modules` at whatever real index it already has) but never surfaced in the
// editor's side menu / module list — see `buildModuleListViews`. `immersive-similar` and
// `immersive-similar-plans` both render the "Similar plans" carousel (one legacy, one current), so
// hiding one without the other would leave a visible duplicate-looking entry.
const HIDDEN_MODULE_TYPES: ReadonlySet<ImmersiveModuleType> = new Set([
  'immersive-similar',
  'immersive-similar-plans',
  'immersive-well-performing-plans',
]);

export function isHiddenModuleType(type: string): boolean {
  return isImmersiveModuleType(type) && HIDDEN_MODULE_TYPES.has(type);
}

// Module types the "Add module" picker never offers, distinct from `HIDDEN_MODULE_TYPES`: a hidden
// type is a real, addable-by-the-backend module the editor merely does not surface in the module
// list, while a non-addable type must never gain a SECOND instance (the hero) or, per the DR-196
// contract this set is shared with, carries backend-required leaf fields the picker's empty-props
// default cannot satisfy (immersive-logos, added by that ticket). Agreed with DR-196 on both Jira
// tickets: this set lives here, next to `HIDDEN_MODULE_TYPES`, so the two tickets' diffs never touch
// the same lines.
const NON_ADDABLE_MODULE_TYPES: ReadonlySet<ImmersiveModuleType> = new Set(['immersive-hero']);

export function isNonAddableModuleType(type: string): boolean {
  return isImmersiveModuleType(type) && NON_ADDABLE_MODULE_TYPES.has(type);
}
