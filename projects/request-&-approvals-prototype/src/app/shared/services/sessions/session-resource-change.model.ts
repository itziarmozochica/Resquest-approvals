import { SalesWindowsRequestDTO } from '@fz-original/app/modules/sessions/shared/components/sales-window/models/sales-window-dto.model';
import { SalesWindowConfig } from '@fz-original/app/modules/sessions/shared/components/sales-window/models/sales-window.model';

export interface SessionCapacityChange {
  tickets: number;
}

export interface SessionSalesChange {
  soldOut: boolean;
}

export interface SessionPricingChange {
  price: number;
}

export interface SessionChange {
  label?: string;
  price?: number;
  capacity?: number;
  soldOut?: boolean;
  isHidden?: boolean;
  salesWindow?: SalesWindowConfig;
}

export interface BatchSessionChangeDTO {
  is_hidden?: boolean;
  sold_out?: boolean;
}

export type BatchSessionChange = Pick<SessionChange, 'isHidden' | 'soldOut'>;

export interface UpdateSessionDetailsRequestBody extends Omit<SessionChange, 'soldOut' | 'isHidden' | 'salesWindow'> {
  sold_out: boolean;
  is_hidden: boolean;
  sales_windows?: SalesWindowsRequestDTO;
}
