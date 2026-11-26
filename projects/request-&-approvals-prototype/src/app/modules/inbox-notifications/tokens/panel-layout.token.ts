import { InjectionToken } from '@angular/core';

export type PanelLayout = 'overlay' | 'sheet';

/**
 * Tells the shared content component how it was rendered.
 * 'overlay' (default): the desktop CDK dropdown, which owns no outer padding, so the content provides its own lateral padding.
 * 'sheet': the mobile Ignite side-panel, whose shell already applies lateral padding, so the content drops its own to avoid doubling it up.
 */
export const PANEL_LAYOUT = new InjectionToken<PanelLayout>('PANEL_LAYOUT');
