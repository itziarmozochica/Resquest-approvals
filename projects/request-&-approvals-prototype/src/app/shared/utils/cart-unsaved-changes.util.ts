import { WithUnsavedChangesGuardComponent } from '../models/with-unsaved-changes-guard-component.model';
import { CartService } from '../services/cart/cart.service';

export function preventUnloadIfUnsavedChanges(this: WithUnsavedChangesGuardComponent, event: BeforeUnloadEvent): void {
  if (!this.areChangesUnsaved()) {
    return;
  }
  event.preventDefault();
  event.returnValue = true;
}

export function discardOnPageHideIfUnsavedChanges(
  component: WithUnsavedChangesGuardComponent,
  cartService: CartService,
  event: PageTransitionEvent,
): void {
  if (event.persisted) {
    return;
  }
  if (!component.areChangesUnsaved()) {
    return;
  }
  component.releaseSeats?.();
  const query = component.getUnloadDiscardCartQuery?.();
  if (query) {
    cartService.discardCartKeepalive(query);
    return;
  }
  const acceptResult = component.acceptFunction?.();
  if (acceptResult && typeof acceptResult.subscribe === 'function') {
    acceptResult.subscribe();
  }
}
