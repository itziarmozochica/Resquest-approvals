import type { MediaCheck, MediaProbeKind } from '../../models/immersive-media-check.model';

// What the field row hands the dialog through IGNT_DIALOG_DATA. Deliberately not a `MediaFieldView`
// — a committed url can reach the dialog `stored` (no store probe result yet), so the dialog
// must resolve its own load state from the `<img>`/`<video>` element rather than trust a check that
// may not exist. `kind: 'any'` tries an image first and falls back to a video on error.
export interface ImmersiveMediaPreviewDialogData {
  kind: MediaProbeKind;
  // The dialog IS the probe: it renders the real `<img>`/`<video>` for this url, so its own load,
  // error and metadata events are the one source of truth. Reported once its own element settles,
  // final (broken only after the `'any'` image-then-video fallback has itself failed), never from
  // a separate store-side probe request for the same url.
  onResolved: (check: MediaCheck) => void;
  url: string;
}
