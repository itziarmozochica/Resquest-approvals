export interface CapacityPoolDTO {
  id: string;
  capacity: number;
  available_units: number;
  sold_units: number;
  occupancy: number;
  blocked_units?: number;
}

export interface CapacityPool {
  id: string;
  capacity: number;
  availableUnits: number;
  soldUnits: number;
  occupancy: number;
  blockedUnits: number;
}
