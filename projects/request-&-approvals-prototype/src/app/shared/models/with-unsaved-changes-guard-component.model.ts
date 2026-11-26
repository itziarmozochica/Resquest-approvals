import type { Observable } from 'rxjs';

import type { DiscardCartQuery } from '../services/cart/discard-cart-query';

export interface UnsavedChangesModalConfig {
  discardButtonKey?: string;
  keepEditingButtonKey?: string;
  messageKey?: string;
  showDangerAcceptButton?: boolean;
  swapModalActions?: boolean;
  titleKey?: string;
}

export const unsavedCartChangesModalConfig: UnsavedChangesModalConfig = {
  keepEditingButtonKey: 'common.unsavedChanges.cancel',
  messageKey: 'common.unsavedChanges.message',
  titleKey: 'common.unsavedChanges.title',
};

export interface WithUnsavedChangesGuardComponent {
  unsavedChangesModalConfig?: UnsavedChangesModalConfig;
  areChangesUnsaved: () => boolean;
  acceptFunction?: () => Observable<void> | undefined;
  cancelFunction?: () => void;
  getUnloadDiscardCartQuery?: () => DiscardCartQuery | null;
  onUnsavedChangesDiscarded?: () => void;
  releaseSeats?: () => void;
  shouldBypassUnsavedChangesGuard?: () => boolean;
}

export interface WithBeforeUnloadHostHandlers {
  onPageHide(event: PageTransitionEvent): void;
  showConfirmOnReload(event: BeforeUnloadEvent): void;
}

export function implementsUnsavedChangesGuard(value: unknown): value is WithUnsavedChangesGuardComponent {
  return typeof (value as Partial<WithUnsavedChangesGuardComponent> | null)?.areChangesUnsaved === 'function';
}
