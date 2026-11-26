export interface EvaluateReservationCapabilityApi {
  capable: boolean;
  violations?: Record<string, number>;
}

export interface EvaluateReservationCapabilityResponse {
  readonly capable: boolean;
  readonly violations?: Readonly<Record<string, number>>;
}

export interface EvaluateCapabilityPayload {
  /** Optional. Sending `''` matches no concession, so an empty channel must be omitted rather than sent. */
  readonly channelId?: string;
}
