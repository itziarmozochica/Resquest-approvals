export interface SessionTypeCapacityDTO {
  id: number;
  label: string;
  is_add_on: boolean;
  default_capacity: number;
  group_id: number;
}

export interface SessionTypeGroupCapacityDTO {
  id: number;
  name: string;
  default_capacity: number;
}

export interface SessionTypeCapacitiesDTO {
  session_types: Array<SessionTypeCapacityDTO>;
  groups: Array<SessionTypeGroupCapacityDTO>;
}

export interface SessionTypeCapacity {
  id: number;
  label: string;
  isAddOn: boolean;
  defaultCapacity: number | null;
  groupId: number | null;
}

export interface SessionTypeGroupCapacity {
  id: number;
  name: string;
  defaultCapacity: number;
}

export interface GroupedSessionTypeCapacities {
  sessionTypes: Array<SessionTypeCapacity>;
  group: SessionTypeGroupCapacity;
}

export interface SessionTypeCapacitiesByGroup {
  sessionTypesWithoutGroup: Array<SessionTypeCapacity>;
  sessionTypesWithGroup: Array<GroupedSessionTypeCapacities>;
}
