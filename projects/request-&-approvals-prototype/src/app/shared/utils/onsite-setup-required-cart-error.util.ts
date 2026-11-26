import { BaseResponse } from '../models/base-response';

export const ONSITE_SETUP_ID_REQUIRED_ERROR_CODE = 'ONSITE_SETUP_ID_REQUIRED_FOR_OPERATION_IN_CHANNEL' as const;

export function responseIndicatesOnsiteSetupIdRequiredForChannel(response: BaseResponse<unknown | null>): boolean {
  const err = response.error as { code?: string | number } | undefined | null;
  return err?.code === ONSITE_SETUP_ID_REQUIRED_ERROR_CODE;
}
