import type { TicketingFeature } from '../ticketing.config';
import { TicketingCartService } from './services/cart.service';

export function withCart(): TicketingFeature {
  return { providers: [TicketingCartService] };
}
