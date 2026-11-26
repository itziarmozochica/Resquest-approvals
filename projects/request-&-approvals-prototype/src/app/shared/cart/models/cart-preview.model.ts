import { SessionItem, SessionItemData } from '@fz-original/app/modules/sessions/session-item.model';
import { CartAdjustmentPrice } from '@fz-original/app/shared/cart/models/cart-adjustment-price.model';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';

export interface CartPreview {
  session_items: SessionItemData[];
  adjustment?: CartAdjustmentPrice;
}

export interface CartPreviewServiceParams {
  cartId: string;
  partnerId: number;
  sessionItems: SessionItem[];
  adjustment?: CartAdjustmentPrice;
  /** The lines of the cart the preview replaces, whose unconfirmed manual prices survive the repaint (GAME-1722). */
  heldSessions?: readonly CartSession[];
}
