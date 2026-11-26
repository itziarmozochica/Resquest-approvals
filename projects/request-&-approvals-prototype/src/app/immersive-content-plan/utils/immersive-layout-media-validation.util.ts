import type { MediaChecks } from '../models/immersive-media-check.model';
import { mediaCheckKeyOf, type MediaUrlRef } from './immersive-layout-media-urls.util';
import { MESSAGE_KEYS, type PublishValidationError, type PublishValidationResult } from './immersive-layout-publish-validation.util';

type MediaValidationCode = 'media_broken' | 'media_checking';

// Opening the editor never probes the committed document, so a committed (kind, url) pair with no
// recorded check yet (or one still `checking` from an on-demand preview probe) must not read as a
// gate blocker — only `newKeys` (the pairs a keystroke just introduced) are held to that standard.
// A `broken` result blocks either way: once the browser has proven a url does not load under its
// current kind, it does not matter whether that pair was old or new.
export function deriveMediaErrors(
  allRefs: readonly MediaUrlRef[],
  newKeys: ReadonlySet<string>,
  checks: MediaChecks,
): PublishValidationError[] {
  return allRefs.flatMap(ref => {
    const key = mediaCheckKeyOf(ref);
    const status = checks[key]?.status;
    if (status === 'broken') {
      return [mediaError('media_broken', ref)];
    }
    if (!newKeys.has(key)) {
      return [];
    }
    return status === 'ok' ? [] : [mediaError('media_checking', ref)];
  });
}

// The one place base document validation and media validation combine, so `gapReport` and the
// persist gate always see one result instead of reconciling two.
export function mergeValidation(base: PublishValidationResult, extra: readonly PublishValidationError[]): PublishValidationResult {
  if (extra.length === 0) {
    return base;
  }
  return { errors: [...base.errors, ...extra], valid: false };
}

function mediaError(code: MediaValidationCode, ref: MediaUrlRef): PublishValidationError {
  return {
    code,
    fieldPath: ref.fieldPath,
    message:
      code === 'media_broken'
        ? `Media failed to load (${ref.moduleId} · ${ref.fieldPath}).`
        : `Media is still being checked (${ref.moduleId} · ${ref.fieldPath}).`,
    messageKey: MESSAGE_KEYS[code],
    moduleId: ref.moduleId,
  };
}
