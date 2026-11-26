import {
  transformCenterTagToTextAlignCenter,
  transformQuillText,
} from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-legacy-content.utils';

import { EMPTY_TEXT_DEFAULTS } from '../_shared/block-text-defaults';
import { normalizeAccentHex } from '../_shared/color.utils';
import { asNonEmptyString, asString, isRecord } from '../_shared/dto-codec.util';
import { uid } from '../_shared/uid.util';
import { TABS_BAR_COLOR_DEFAULT_HEX } from './tabs.constants';
import { createDefaultTab } from './tabs.helpers';
import { TabItem, TabsProps } from './tabs.model';

/** Wire shape (snake_case) — see models/block.dto.ts for the conventions. */
export interface TabItemDTO {
  id: string;
  label: string;
  body: string;
  content_title: string;
  image_src: string;
}

export interface TabsPropsDTO {
  tab_bar_color: string;
  tabs: TabItemDTO[];
  // `active_index` is intentionally absent from the wire shape: it is
  // session-only UI state and never persisted. `tabsPropsFromDto`
  // re-initialises `TabsProps.activeIndex` to 0 on every load.
}

export function tabsPropsFromDto(raw: Record<string, unknown>): TabsProps {
  const rawTabs = Array.isArray(raw['tabs']) ? raw['tabs'] : [];
  const tabs = rawTabs.filter(isRecord).map(
    (t): TabItem => ({
      id: asNonEmptyString(t['id'], uid),
      label: asString(t['label']),
      body: transformCenterTagToTextAlignCenter(asString(t['body'])),
      contentTitle: asString(t['content_title']),
      imageSrc: asString(t['image_src']),
    }),
  );
  return {
    tabBarColor: normalizeAccentHex(raw['tab_bar_color'], TABS_BAR_COLOR_DEFAULT_HEX),
    // A tabs block must always expose at least one tab: the editor edits tabs
    // in place (`updateTab` maps over this array) and mandatory-field
    // validation only walks existing tabs, so an empty wire list would both
    // silently drop edits and let an empty block pass publish validation.
    tabs: tabs.length > 0 ? tabs : [createDefaultTab(0, EMPTY_TEXT_DEFAULTS)],
    // Session-only UI state — always re-initialised on load (never read from
    // the wire, never written back; see TabsPropsDTO).
    activeIndex: 0,
  };
}

export function tabsPropsToDto(p: TabsProps): TabsPropsDTO {
  return {
    tab_bar_color: normalizeAccentHex(p.tabBarColor, TABS_BAR_COLOR_DEFAULT_HEX),
    tabs: p.tabs.map(
      (t): TabItemDTO => ({
        id: t.id,
        label: t.label,
        body: transformQuillText(t.body),
        content_title: t.contentTitle,
        image_src: t.imageSrc,
      }),
    ),
    // active_index intentionally omitted: session-only.
  };
}
