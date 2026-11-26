import { InjectionToken, type Signal } from '@angular/core';

// The two sibling plan-edition tabs the immersive editor can shortcut to. Kept as a closed union
// (not the route segment string) so the engine names them independently of how the host routes.
export type ImmersiveSiblingTab = 'media' | 'venue';

/**
 * Bridge to the sibling plan-edition tabs (Media, Venue) that surround the immersive editor.
 * Provided by `ImmersiveContentPlanEditorComponent`; it lists no tab when the host route has no
 * sibling tab routes (the legacy `ContentPlanComponent`), so the note renders without a link.
 */
export interface ImmersiveSiblingTabs {
  // Tabs the current plan/user can actually navigate to right now.
  readonly availableTabs: Signal<readonly ImmersiveSiblingTab[]>;
  open(tab: ImmersiveSiblingTab): void;
}

export const IMMERSIVE_SIBLING_TABS = new InjectionToken<ImmersiveSiblingTabs>('IMMERSIVE_SIBLING_TABS');
