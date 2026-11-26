import { SelectorSettingType, SessionSelectorType } from './selector-session-section.enum';

export interface SelectorTypeLabel<T extends string> {
  labelKey: string;
  type: T;
}

/** Order in which the session picker lists its types when the config does not restrict them. */
export const SESSION_TYPE_LABELS: readonly SelectorTypeLabel<SessionSelectorType>[] = [
  { labelKey: 'eventSettings.selector.dateTime', type: SessionSelectorType.DateTime },
  { labelKey: 'eventSettings.selector.date', type: SessionSelectorType.Date },
  { labelKey: 'eventSettings.selector.timeless', type: SessionSelectorType.Session },
  { labelKey: 'eventSettings.selector.dateTimeSeatingMap', type: SessionSelectorType.DateTimeSeatingMap },
  { labelKey: 'eventSettings.selector.explodePipe', type: SessionSelectorType.ExplodePipe },
  { labelKey: 'eventSettings.selector.freeSelectionMap', type: SessionSelectorType.FreeSelectionMap },
  { labelKey: 'eventSettings.selector.fullBsaDateSeatingMap', type: SessionSelectorType.FullBsaDateSeatingMap },
  { labelKey: 'eventSettings.selector.fullBsaDateTimeSeatingMap', type: SessionSelectorType.FullBsaDateTimeSeatingMap },
  { labelKey: 'eventSettings.selector.realTimeThirdParty', type: SessionSelectorType.RealTimeThirdParty },
  { labelKey: 'eventSettings.selector.sessionSingleDate', type: SessionSelectorType.SessionSingleDate },
  { labelKey: 'eventSettings.selector.ticketNumberFreeSelectionMap', type: SessionSelectorType.TicketNumberFreeSelectionMap },
];

/** Order in which the setting picker lists its types when the config does not restrict them. */
export const SETTING_TYPE_LABELS: readonly SelectorTypeLabel<SelectorSettingType>[] = [
  { labelKey: 'eventSettings.selector.multiDetailed', type: SelectorSettingType.MultiDetailed },
  { labelKey: 'eventSettings.selector.multiVertical', type: SelectorSettingType.MultiVertical },
  { labelKey: 'eventSettings.selector.singleHorizontal', type: SelectorSettingType.SingleHorizontal },
  { labelKey: 'eventSettings.selector.singleVertical', type: SelectorSettingType.SingleVertical },
  { labelKey: 'eventSettings.selector.multiCatalog', type: SelectorSettingType.MultiCatalog },
];
