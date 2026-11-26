import { IconProp } from '@fortawesome/fontawesome-svg-core';

import { OssCustomTilesData } from './oss-custom-tiles-data.model';

export interface OssCustomTabData {
  setupId: string;
  setupName: string;
  setupIcon: IconProp;
  tilesData: OssCustomTilesData | null;
  isLoading: boolean;
  datetimeSelected: string | null;
}
