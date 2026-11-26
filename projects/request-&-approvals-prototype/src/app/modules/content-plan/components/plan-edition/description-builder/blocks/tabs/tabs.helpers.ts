import { BlockTextDefaults } from '../_shared/block-text-defaults';
import { uid } from '../_shared/uid.util';
import { TabItem } from './tabs.model';

export function createDefaultTab(atIndex: number, defaults: BlockTextDefaults): TabItem {
  return {
    id: uid(),
    label: defaults.tabLabel(atIndex),
    contentTitle: '',
    body: '',
    imageSrc: '',
  };
}
