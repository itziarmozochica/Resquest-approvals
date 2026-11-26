import { OssCustomTile } from './oss-custom-tile.model';
import { OssSessionAvailability } from './oss-session-availability.model';

export interface OssSessionWithCustomTile {
  session: OssSessionAvailability;
  customTile: OssCustomTile;
}
