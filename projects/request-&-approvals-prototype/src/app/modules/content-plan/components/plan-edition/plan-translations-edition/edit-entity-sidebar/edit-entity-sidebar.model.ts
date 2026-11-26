export interface EditEntitySidebarItem {
  readonly id: string;
  readonly isSelected: boolean;
  readonly name: string;
  readonly isLocked?: boolean;
  readonly lockedBadgeLabel?: string;
  readonly lockedTooltip?: string;
}

export interface EditEntitySidebarDiscardModalConfig {
  readonly cancelButtonLabel: string;
  readonly question: string;
  readonly saveButtonLabel: string;
  readonly title: string;
}

export type EditEntitySidebarEntityType = 'languages' | 'channels';
