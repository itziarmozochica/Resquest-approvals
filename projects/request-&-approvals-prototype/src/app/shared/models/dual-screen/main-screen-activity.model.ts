export const MAIN_SCREEN_ACTIVITY_CHANNEL = 'fz_main_screen_activity_channel';

export const MAIN_SCREEN_BUSY_MESSAGE = 'busy';

export const MAIN_SCREEN_ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'scroll'] as const;

export const MAIN_SCREEN_ACTIVITY_LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: true };

export const MAIN_SCREEN_ACTIVITY_THROTTLE_MS = 1000;

export const MOSAIC_IDLE_DELAY_MS = 7000;
