export interface MultiSelectExclusiveGroupMember {
  close(): void;
  isOpen(): boolean;
}

export interface MultiSelectExclusiveGroup {
  notifyOpened(opened: MultiSelectExclusiveGroupMember): void;
  register(member: MultiSelectExclusiveGroupMember): void;
  unregister(member: MultiSelectExclusiveGroupMember): void;
}
