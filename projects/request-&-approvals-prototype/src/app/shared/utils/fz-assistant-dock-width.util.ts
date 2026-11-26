export const FZ_ASSISTANT_DOCK_WIDTH_DEFAULT = 380;

export const FZ_ASSISTANT_DOCK_WIDTH_MIN = 320;

export const FZ_ASSISTANT_DOCK_WIDTH_MAX = 720;

export const FZ_ASSISTANT_DOCK_WIDTH_KEYBOARD_STEP = 16;

export const FZ_ASSISTANT_DOCK_RESERVED_NAV_WIDTH = 256;

export const FZ_ASSISTANT_DOCK_NAV_RESERVE_BREAKPOINT = 1200;

export const FZ_ASSISTANT_DOCK_RESERVED_MAIN_CONTENT_WIDTH = 480;

export function clampFzAssistantDockWidthToBounds(requested: number): number {
  if (!Number.isFinite(requested)) {
    return FZ_ASSISTANT_DOCK_WIDTH_DEFAULT;
  }

  return Math.round(Math.min(Math.max(requested, FZ_ASSISTANT_DOCK_WIDTH_MIN), FZ_ASSISTANT_DOCK_WIDTH_MAX));
}

export function fzAssistantDockMaxWidth(viewportWidth: number): number {
  if (!Number.isFinite(viewportWidth)) {
    return FZ_ASSISTANT_DOCK_WIDTH_MAX;
  }

  const roomLeftOfTheDock: number =
    viewportWidth >= FZ_ASSISTANT_DOCK_NAV_RESERVE_BREAKPOINT
      ? viewportWidth - FZ_ASSISTANT_DOCK_RESERVED_NAV_WIDTH - FZ_ASSISTANT_DOCK_RESERVED_MAIN_CONTENT_WIDTH
      : Math.min(
          viewportWidth - FZ_ASSISTANT_DOCK_RESERVED_MAIN_CONTENT_WIDTH,
          FZ_ASSISTANT_DOCK_NAV_RESERVE_BREAKPOINT - FZ_ASSISTANT_DOCK_RESERVED_NAV_WIDTH - FZ_ASSISTANT_DOCK_RESERVED_MAIN_CONTENT_WIDTH,
        );

  return Math.max(FZ_ASSISTANT_DOCK_WIDTH_DEFAULT, Math.min(FZ_ASSISTANT_DOCK_WIDTH_MAX, roomLeftOfTheDock));
}

export function clampFzAssistantDockWidth(requested: number, viewportWidth: number): number {
  return Math.min(clampFzAssistantDockWidthToBounds(requested), fzAssistantDockMaxWidth(viewportWidth));
}
