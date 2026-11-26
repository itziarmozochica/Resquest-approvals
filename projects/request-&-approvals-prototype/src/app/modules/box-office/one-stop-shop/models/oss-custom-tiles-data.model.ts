import { OssCustomTile, OssCustomTileDto } from './oss-custom-tile.model';

export interface OssCustomTileWrapperDto {
  custom_tile: OssCustomTileDto;
}

export interface OssCustomTilesDataDto {
  custom_tiles: OssCustomTileWrapperDto[];
}

export interface OssCustomTileWrapper {
  customTile: OssCustomTile;
}

export interface OssCustomTilesData {
  customTiles: OssCustomTileWrapper[];
}
