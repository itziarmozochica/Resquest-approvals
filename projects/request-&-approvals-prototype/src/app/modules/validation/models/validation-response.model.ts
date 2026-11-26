import { int } from '@zxing/library/esm/customTypings';

import { AccessControlProfile } from '../../../shared/models/access-control/access-control.model';

export interface ValidationResponseWarning {
  id: string;
  title: string;
  message: string;
}

export interface ValidationResponseError {
  message: string;
  code: int;
  warnings?: ValidationResponseWarning[];
}

export interface ValidationResponse {
  code: string;
  validated: boolean;
  error?: ValidationResponseError;
  profilesToSelect?: AccessControlProfile[];
}
