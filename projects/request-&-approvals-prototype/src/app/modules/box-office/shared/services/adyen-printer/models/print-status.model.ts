export const enum PrintStatusEnum {
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
}

export interface PrintStatus {
  status: PrintStatusEnum;
  atIndex?: number;
}
