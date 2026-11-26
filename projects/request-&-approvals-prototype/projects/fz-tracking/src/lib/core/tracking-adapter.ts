export interface TrackingTrackPayload {
  readonly context: Record<string, unknown>;
  readonly event: unknown;
}

export interface TrackingAdapter {
  isSdkReady: () => boolean;
  track: (eventId: string, payload: TrackingTrackPayload) => void;
}
