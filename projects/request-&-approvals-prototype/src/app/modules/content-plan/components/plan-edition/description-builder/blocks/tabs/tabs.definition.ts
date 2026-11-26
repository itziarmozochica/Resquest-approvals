import { uid } from '../_shared/uid.util';
import { BlockDefinition } from '../block-definition';
import { TABS_BAR_COLOR_DEFAULT_HEX } from './tabs.constants';
import { tabsPropsFromDto, tabsPropsToDto } from './tabs.dto';
import { TABS_FIELDS } from './tabs.field-contract';
import { createDefaultTab } from './tabs.helpers';
import { TABS_I18N } from './tabs.i18n-keys';

export const TABS_BLOCK: BlockDefinition<'tabs'> = {
  type: 'tabs',
  icon: 'tab',
  labelKey: TABS_I18N.componentLabel,
  createDefaultProps: defaults => ({
    tabBarColor: TABS_BAR_COLOR_DEFAULT_HEX,
    tabs: [createDefaultTab(0, defaults), createDefaultTab(1, defaults)],
    activeIndex: 0,
  }),
  cloneProps: props => ({
    ...props,
    tabs: props.tabs.map(t => ({ ...t, id: uid() })),
  }),
  dtoType: 'tabs',
  fromDto: tabsPropsFromDto,
  toDto: tabsPropsToDto,
  fields: TABS_FIELDS,
};
