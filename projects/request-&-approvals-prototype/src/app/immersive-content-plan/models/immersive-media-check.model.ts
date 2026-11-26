export type MediaCheckStatus = 'checking' | 'broken' | 'ok';

export type MediaKind = 'image' | 'video';

// The kind a media field is probed as: `image`/`video` once a sibling `type` field (or the
// descriptor itself) pins it down, `any` while it still pays for the image-then-video guess.
export type MediaProbeKind = 'image' | 'video' | 'any';

export interface MediaCheck {
  height?: number;
  kind?: MediaKind;
  status: MediaCheckStatus;
  width?: number;
}

// One cache entry per (kind, url): the sibling `type` decides how a url is probed, so the same
// url probed as image and later as video are two different checks — otherwise a check recorded
// under the stale kind would keep blocking the field after the user fixed the type.
export function mediaCheckKey(media: MediaProbeKind, url: string): string {
  return `${media}\n${url}`;
}

// Keyed by `mediaCheckKey(media, url)`, never the url alone — see `mediaCheckKey`. The same url
// probed from two fields under the same kind still shares one entry and one in-flight request.
export type MediaChecks = Record<string, MediaCheck>;
