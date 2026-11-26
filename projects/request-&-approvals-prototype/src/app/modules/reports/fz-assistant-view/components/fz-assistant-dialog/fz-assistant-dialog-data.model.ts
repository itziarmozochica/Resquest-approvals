import type { Subscription } from 'rxjs';

export interface FzAssistantDialogChromeApi {
  cancelCurrentGeneration(): void;
  detachSendSubscriptionForRouteHandoff(): Subscription | null;
}

export interface FzAssistantDialogData {
  readonly initialQuery: string;
  readonly adoptHandoffSubscription: (subscription: Subscription | null) => void;
  readonly registerChromeApi: (api: FzAssistantDialogChromeApi) => void;
  readonly unregisterChromeApi: () => void;
}
