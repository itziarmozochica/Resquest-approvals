let nextOverlayPaneHostId = 0;

export function resolveOverlayPaneAppendTo(hostElement: HTMLElement): string {
  const overlayPane = hostElement.closest('.cdk-overlay-pane');
  if (!(overlayPane instanceof HTMLElement)) {
    return '';
  }

  if (!overlayPane.id) {
    nextOverlayPaneHostId += 1;
    overlayPane.id = `overlay-pane-ng-select-host-${nextOverlayPaneHostId}`;
  }

  overlayPane.style.position = 'relative';

  return `#${overlayPane.id}`;
}
