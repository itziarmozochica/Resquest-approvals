export enum OssTileType {
  LEAF = 'LEAF',
  PARENT = 'PARENT',
}

export type OssTileTypeValues = keyof typeof OssTileType;
