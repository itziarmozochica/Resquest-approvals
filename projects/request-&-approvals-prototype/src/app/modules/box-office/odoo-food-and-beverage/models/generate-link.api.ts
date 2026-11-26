import type { BaseResponse } from '@fz/http-models';

export type GenerateLinkType = 'pos' | 'tab';

export interface GenerateLinkApi {
  account_id: string;
  link: string;
}

export type GenerateLinkResponse = BaseResponse<GenerateLinkApi>;
