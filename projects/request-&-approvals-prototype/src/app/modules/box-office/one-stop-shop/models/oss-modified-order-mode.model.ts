export enum ModifiedOrderModeEnum {
  AddTickets = 'add_tickets',
  ModifyOrder = 'modify_order',
  UpgradeSeating = 'upgrade_seating',
}

export type ModifiedOrderMode = 'upgrade_seating' | 'add_tickets' | 'modify_order';
