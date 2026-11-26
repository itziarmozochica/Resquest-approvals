import type { LayoutPersistIntent } from '../../utils/immersive-layout-persist-gate.util';
import type { PublishValidationError } from '../../utils/immersive-layout-publish-validation.util';
import type { ReorderHints } from '../../utils/immersive-layout-working.util';
import { GENERAL_SETTINGS_ID } from '../immersive-content-plan-editor.model';
import type { AutoTranslateAction } from '../immersive-layout-translation.model';
import type { MediaChecks } from '../immersive-media-check.model';
import type { ImmersivePlanChannel } from '../immersive-plan-channel.model';
import type { PlanviewLayout, PlanviewLayoutEnvelope } from '../planview-layout-envelope.model';

// Two independent channels, not one shared field: `loadEnvelope` and `scheduleGeneration` used to
// clobber each other through a single `action` (a stale `pollTimeout` survived a retry; a chained
// re-GET's `fetchSuccess` wiped a `scheduleError` the user had not seen yet).
export type FetchAction = 'fetchError' | 'fetchSuccess' | 'pollTimeout' | null;
export type PublishAction =
  | 'conflict'
  | 'publishError'
  | 'publishSuccess'
  | 'revertError'
  | 'revertSuccess'
  | 'saveError'
  | 'saveSuccess'
  | null;
export type ScheduleAction = 'scheduleError' | null;

export interface ImmersiveContentPlanStoreState {
  // Set only when a run left locales untranslated; reset when the next run starts.
  autoTranslateAction: AutoTranslateAction | null;
  autoTranslatingToken: string | null;
  // The plan's channels a variant can be added for; empty while the flag is off or the request failed.
  channels: ImmersivePlanChannel[];
  // Bumped by every discard so a request started before it cannot land on the restored document.
  draftsEpoch: number;
  // Bumped on every `loadEnvelope` reset, and never reset itself. A write captures it and checks
  // it on the way out: leaving a plan and coming back is a new editing session even though
  // `partnerId`/`planId` match again, so the abandoned response has to be dropped.
  editorEpoch: number;
  envelope: PlanviewLayoutEnvelope | null;
  error: unknown;
  fetchAction: FetchAction;
  // The Optimizely flag for this plan: it gates adding a variant only, never the variants already stored.
  isChannelVariantsEnabled: boolean;
  isLoading: boolean;
  isVenueSvgEnabled: boolean;
  // Keyed by media url, never evicted for the life of the editor: a url probed once (`checking`,
  // then `ok` or `broken`) never needs a second request, even if the same value is retyped.
  mediaChecks: MediaChecks;
  partnerId: number | null;
  // Which write is in flight, not merely that one is: the bar has to spin the button the user
  // pressed, and `isLoading` is shared with the fetch and the generation.
  pendingIntent: LayoutPersistIntent | null;
  planId: number | null;
  publishAction: PublishAction;
  publishErrors: PublishValidationError[];
  // Last dragged identity per group (and `modules`), used only to break a diff tie; reset with `working`.
  reorderHints: ReorderHints;
  scheduleAction: ScheduleAction;
  // The channel whose variant of `selectedModuleId` is being edited; null edits the default module.
  selectedChannel: string | null;
  selectedLocale: string | null;
  selectedModuleId: string;
  working: PlanviewLayout | null;
}

export const initialState: ImmersiveContentPlanStoreState = {
  autoTranslateAction: null,
  autoTranslatingToken: null,
  channels: [],
  draftsEpoch: 0,
  editorEpoch: 0,
  envelope: null,
  error: null,
  fetchAction: null,
  isChannelVariantsEnabled: false,
  isLoading: false,
  isVenueSvgEnabled: false,
  mediaChecks: {},
  partnerId: null,
  pendingIntent: null,
  planId: null,
  publishAction: null,
  publishErrors: [],
  reorderHints: {},
  scheduleAction: null,
  selectedChannel: null,
  selectedLocale: null,
  selectedModuleId: GENERAL_SETTINGS_ID,
  working: null,
};
