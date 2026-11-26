import { CustomTabTile } from '../services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.model';
import { CustomTileColorKeys } from './custom-tile.model';

export interface DialogEditTileAppearanceState {
  defaultColorKey: CustomTileColorKeys;
  isVisible: boolean;
  tabIndex: number;
  tile: CustomTabTile | null;
  tileIndex: number;
}

export interface DialogEditTileAppearanceFormValues {
  customColor: string | null;
  customName: string | null;
}
