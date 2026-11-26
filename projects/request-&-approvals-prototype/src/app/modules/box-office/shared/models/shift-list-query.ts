import { ShiftStatus } from './shifts.model';

export interface ShiftListQueryDTO {
  created_at_from?: string;
  created_at_to?: string;
  status?: ShiftStatus;
  page?: number;
  items_per_page?: number;
  user_id?: number;
  cash_register_id?: string;
  onsite_setup_id?: string;
}

export interface ShiftListQuery {
  createdAtFrom?: Date;
  createdAtTo?: Date;
  status?: ShiftStatus;
  page?: number;
  itemsPerPage?: number;
  userId?: number;
  cashRegisterId?: string;
  onsiteSetupId?: string;
}
