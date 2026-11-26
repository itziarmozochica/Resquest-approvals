import { BasePromotionsManagerService, Promotion } from '../../../../../services/promotions';

export interface PromotionModalConfig {
  cartId: string;
  isRequired: boolean;
  partnerId: number;
  promotions: Promotion[];
  promotionsServiceManager: BasePromotionsManagerService;
}

export interface PromotionCustom extends Promotion {
  isApplied?: boolean;
  isInvalid?: boolean;
  isOpen?: boolean;
}
