import { inject, Injectable, InjectionToken } from '@angular/core';

import { catchError, Observable, of, switchMap, timeout, type OperatorFunction } from 'rxjs';

import type { MediaCheck, MediaProbeKind } from '../models/immersive-media-check.model';

const PROBE_TIMEOUT_MS = 10_000;

export interface MediaProbeElementFactory {
  createImage(): HTMLImageElement;
  createVideo(): HTMLVideoElement;
}

const defaultMediaProbeElementFactory: MediaProbeElementFactory = {
  createImage: () => new Image(),
  createVideo: () => document.createElement('video'),
};

// Testability seam: the default factory reaches the real DOM, the spec substitutes fake elements
// that dispatch `load` / `error` / `loadedmetadata` by hand.
export const MEDIA_PROBE_ELEMENT_FACTORY = new InjectionToken<MediaProbeElementFactory>('MEDIA_PROBE_ELEMENT_FACTORY', {
  factory: () => defaultMediaProbeElementFactory,
});

const brokenOnTimeout: OperatorFunction<MediaCheck, MediaCheck> = source =>
  source.pipe(
    timeout(PROBE_TIMEOUT_MS),
    catchError(() => of<MediaCheck>({ status: 'broken' })),
  );

@Injectable()
export class ImmersiveMediaProbeService {
  readonly #elementFactory = inject(MEDIA_PROBE_ELEMENT_FACTORY);

  probe(url: string, media: MediaProbeKind): Observable<MediaCheck> {
    switch (media) {
      case 'image':
        return this.#probeImage(url);
      case 'video':
        return this.#probeVideo(url);
      default:
        // 'any' is image-first: most media fields on this document are images, so trying image
        // first settles the common case with a single probe instead of always racing both.
        return this.#probeImage(url).pipe(switchMap(check => (check.status === 'broken' ? this.#probeVideo(url) : of(check))));
    }
  }

  #probeImage(url: string): Observable<MediaCheck> {
    return new Observable<MediaCheck>(subscriber => {
      const image = this.#elementFactory.createImage();
      const onLoad = (): void => {
        subscriber.next({ height: image.naturalHeight, kind: 'image', status: 'ok', width: image.naturalWidth });
        subscriber.complete();
      };
      const onError = (): void => {
        subscriber.next({ status: 'broken' });
        subscriber.complete();
      };
      image.addEventListener('load', onLoad);
      image.addEventListener('error', onError);
      image.src = url;
      return () => {
        image.removeEventListener('load', onLoad);
        image.removeEventListener('error', onError);
        image.src = '';
      };
    }).pipe(brokenOnTimeout);
  }

  #probeVideo(url: string): Observable<MediaCheck> {
    return new Observable<MediaCheck>(subscriber => {
      const video = this.#elementFactory.createVideo();
      const onLoadedMetadata = (): void => {
        subscriber.next({ height: video.videoHeight, kind: 'video', status: 'ok', width: video.videoWidth });
        subscriber.complete();
      };
      const onError = (): void => {
        subscriber.next({ status: 'broken' });
        subscriber.complete();
      };
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);
      video.muted = true;
      video.preload = 'metadata';
      video.src = url;
      return () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
        video.src = '';
      };
    }).pipe(brokenOnTimeout);
  }
}
