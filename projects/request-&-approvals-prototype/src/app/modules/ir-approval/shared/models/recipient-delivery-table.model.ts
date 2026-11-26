import { RecipientDelivery } from './alert-config.model';

export interface RowPatch {
  emailNorm: string;
  patch: Partial<RecipientDelivery>;
}

export interface OverridePatch {
  emailNorm: string;
  value: string;
}
