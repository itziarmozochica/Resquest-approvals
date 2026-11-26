export interface ActivityRow {
  readonly activityName: string;
  readonly assets: readonly ActivityRowAsset[];
  readonly isExclusiveHire: boolean;
  readonly isExpanded: boolean;
  readonly key: string;
  readonly pax: number | null;
  readonly timeRange: string;
}

export interface ActivityRowAsset {
  readonly assetName: string;
  readonly bookedSlotId: number;
  readonly canLocate: boolean;
  readonly canMove: boolean;
  readonly groups: number;
  readonly isProvisional?: boolean;
  readonly partySizes?: readonly number[];
  readonly showGroups: boolean;
}
