import type { FlexibleBundleSessions } from '@fz-original/app/shared/models/plan/flexible-bundle-sessions.model';

export interface PosFlexibleBundleStoreState {
  error: unknown;
  flexibleBundleSessions: FlexibleBundleSessions | null;
  isLoading: boolean;
}

export const initialState: PosFlexibleBundleStoreState = {
  error: null,
  flexibleBundleSessions: null,
  isLoading: false,
};

export interface PosFlexibleBundleSessionsRequest {
  channelId: string;
  partnerId: number;
  planId: number;
}

export type PosFlexibleBundleSettledHandler = () => void;
