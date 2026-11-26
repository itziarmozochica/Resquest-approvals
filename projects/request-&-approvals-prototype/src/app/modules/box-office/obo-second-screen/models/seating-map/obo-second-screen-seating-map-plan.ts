import type { SecondScreenSeatingMapStorage } from '@fz-original/app/shared/models/seating-map/second-screen-seating-map-storage.model';

export type RenderKind = 'clearSeatingMap' | 'fetchSeatingMapForSessionIds' | 'hideSeatingMap' | 'showSeatingMap';

export type SecondScreenPlan = {
  kind: RenderKind;
  options?: unknown;
};

/** Options when {@link RenderKind} is `showSeatingMap`. */
export type SecondScreenPlanShowSeatingMapOptions = {
  channels: string[];
  eventKey: string;
  fullRender: boolean;
  highlightedSeats: string[];
  mapKey: string;
  payload: Partial<SecondScreenSeatingMapStorage>;
  workspaceKey: string;
};
