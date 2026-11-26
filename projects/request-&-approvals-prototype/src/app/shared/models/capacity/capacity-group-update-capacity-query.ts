export interface CapacityGroupUpdateCapacityQuery {
  partnerId: number;
  planId: number;
  capacityGroupId: number | string;
  capacity: number;
  timeSlotId?: number;
}

export interface CapacityGroupUpdateCapacityBodyDTO {
  capacity: number;
  time_slot_id?: number;
}
