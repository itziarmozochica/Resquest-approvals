import type { FieldDescriptor } from '../models/immersive-layout-descriptor.model';
import { getDescriptor } from '../models/immersive-layout-descriptor.registry';
import type { ImmersiveLayoutModule, ImmersiveLayoutProps, ImmersiveLayoutValue } from '../models/immersive-layout-document.model';
import { mediaCheckKey, type MediaProbeKind } from '../models/immersive-media-check.model';
import type { PlanviewLayout } from '../models/planview-layout-envelope.model';
import { collectModuleFields, isFieldHiddenByValue, type CollectedField } from './immersive-layout-field.util';
import { readPropValue } from './immersive-layout-prop-path.util';
import { isHttpsUrl } from './immersive-layout-url.util';

export interface MediaUrlRef {
  fieldPath: string;
  media: MediaProbeKind;
  moduleId: string;
  url: string;
}

// The one place that turns "which url fields are media" (the registry's `media` flag) into "which
// urls are actually there to probe". A field with no `media` flag is a link, never collected, a
// media field the editor hides by a sibling value is never probed, and a media field with no usable
// https value has nothing to probe yet.
export function collectMediaUrls(working: PlanviewLayout | null): MediaUrlRef[] {
  if (working === null) {
    return [];
  }
  return working.schema.modules.flatMap(module => {
    const descriptor = getDescriptor(module.type);
    if (descriptor === undefined) {
      return [];
    }
    return collectModuleFields(module, descriptor).flatMap(collected => {
      const { field } = collected;
      if (field.media === undefined || isFieldHiddenByValue(field, module.props)) {
        return [];
      }
      const raw = readPropValue(module.props, collected.path);
      if (!isHttpsUrl(raw)) {
        return [];
      }
      const media = resolveMediaKind(field, readMediaKindSibling(module.props, collected));
      return [{ fieldPath: collected.path, media, moduleId: module.id, url: raw }];
    });
  });
}

// The declared media kind, refined by a sibling field the descriptor names (`mediaKindField`) when
// the stored item actually carries one: a typed hero item is probed as exactly that kind, and only
// a null-typed (or kindless) item still pays for the `'any'` image-then-video guess.
export function resolveMediaKind(field: FieldDescriptor, siblingValue: ImmersiveLayoutValue | undefined): MediaProbeKind {
  if (siblingValue === 'image' || siblingValue === 'video') {
    return siblingValue;
  }
  return field.media ?? 'any';
}

// Same resolution as `collectMediaUrls`, for a single already-collected field — the dialog needs
// the same "trust the sibling type over the image-then-video guess" answer the automatic probe
// pipeline gets, without re-walking the whole module.
export function resolveMediaKindForField(module: ImmersiveLayoutModule, collected: CollectedField): MediaProbeKind {
  return resolveMediaKind(collected.field, readMediaKindSibling(module.props, collected));
}

function readMediaKindSibling(props: ImmersiveLayoutProps, collected: CollectedField): ImmersiveLayoutValue | undefined {
  const { mediaKindField } = collected.field;
  return mediaKindField === undefined ? undefined : readPropValue(props, siblingPropPath(collected.path, mediaKindField));
}

function siblingPropPath(path: string, siblingField: string): string {
  const segments = path.split('.');
  segments[segments.length - 1] = siblingField;
  return segments.join('.');
}

// Whether two media url batches probe the exact same (kind, url) pairs, regardless of object
// identity or the order/duplication their fields introduced. Feeds `distinctUntilChanged` ahead of
// the store's `debounceTime`: a keystroke in an unrelated field recomputes `newMediaUrls` into a
// fresh array of equal content, and without this check that fresh-but-equal emission restarts the
// debounce timer forever, so `media_checking` (and the Save/Publish gate it feeds) never clears.
export function sameMediaUrlSet(a: readonly MediaUrlRef[], b: readonly MediaUrlRef[]): boolean {
  return mediaUrlSetKey(a) === mediaUrlSetKey(b);
}

function mediaUrlSetKey(refs: readonly MediaUrlRef[]): string {
  return [...new Set(refs.map(mediaCheckKeyOf))].sort().join('\n');
}

// The one cache/gate key for a collected media reference: a sibling `type` decides how a url is
// probed, so the same url probed as image and later as video must never share one `mediaChecks`
// entry — see `mediaCheckKey`.
export function mediaCheckKeyOf(ref: MediaUrlRef): string {
  return mediaCheckKey(ref.media, ref.url);
}

// The (kind, url) pairs the probe rxMethod is allowed to spend a request on: only the ones a
// keystroke actually introduced. A pair the committed document already carries never appears here
// — opening the editor must not probe the whole document, only what the user is actively changing.
// A url whose sibling `type` just flipped counts as new even though the committed document already
// carries that same url under its old kind: the two are different `mediaCheckKey` entries, so the
// freshly-typed kind still gets its own probe instead of reading off the stale one.
export function collectNewMediaUrls(working: PlanviewLayout | null, committed: PlanviewLayout | null): MediaUrlRef[] {
  const committedKeys = new Set(collectMediaUrls(committed).map(mediaCheckKeyOf));
  return collectMediaUrls(working).filter(ref => !committedKeys.has(mediaCheckKeyOf(ref)));
}
