import type { ServiceTimeProduct } from './service-time-modal.component';

export interface ProductRow extends ServiceTimeProduct {
  dayOffset: number;
  time: string;
}
