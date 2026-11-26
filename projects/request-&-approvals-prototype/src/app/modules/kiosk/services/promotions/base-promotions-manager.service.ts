import { Observable } from 'rxjs';

import { PromotionAppliedResponse, PromotionResponse, PromotionsResult, PromotionValidate } from './models';

export abstract class BasePromotionsManagerService {
  abstract get(cartId: string, partnerId: number): Observable<PromotionsResult>;
  abstract post(cartId: string, partnerId: number, promotions: PromotionResponse[]): Observable<PromotionAppliedResponse>;
  abstract validate(cartId: string, partnerId: number, promotionsApplied: PromotionResponse[]): Observable<PromotionValidate[]>;
}
