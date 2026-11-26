import { InjectionToken } from '@angular/core';

/**
 * Closes the notifications panel regardless of how it was opened.
 * Provided by the desktop wrapper (CDK dropdown) and by the overlay service for the mobile bottom-sheet,
 * so the shared content component can close itself without knowing which paradigm rendered it.
 */
export const PANEL_CLOSE = new InjectionToken<() => void>('PANEL_CLOSE');
