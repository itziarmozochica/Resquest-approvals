import { inject, Injectable } from '@angular/core';

import { DatadogLogLevel } from '../../../../core/error/datadog/logger/datadog-log.service';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import {
  kioskScreensaverCacheName,
  kioskScreensaverFallbackLogoUrl,
  kioskScreensaverMaxDownloadAttempts,
  kioskScreensaverMaxPlaybackAttempts,
} from '../../constants/screensaver/screensaver.constants';
import { KioskService } from '../kiosk.service';

@Injectable({
  providedIn: 'root',
})
export class KioskScreensaverService {
  readonly #kioskService = inject(KioskService);
  readonly #optimizelyService = inject(OptimizelyService);
  #cacheUnavailableWarned = false;
  #downloadAttempts = 0;
  #playbackAttempts = 0;
  #downloading = false;
  #missingVideoUrlWarned = false;
  #objectUrl: string | null = null;
  #videoUrl: string | null = null;

  getScreensaverLogoUrl(): string {
    const logo: string | undefined = this.#getVideoVariable()?.screensaverLogo;
    if (typeof logo === 'string' && logo !== '') {
      return `assets/images/logos/${logo}`;
    }
    return kioskScreensaverFallbackLogoUrl;
  }

  getScreensaverLogoWidthPx(): number | null {
    const width = Number(this.#getVideoVariable()?.screensaverLogoWidth);
    return Number.isFinite(width) && width > 0 ? width : null;
  }

  async getVideoObjectUrl(): Promise<string | null> {
    const cached = await this.#getReadyVideo();
    if (cached === undefined) {
      return null;
    }
    this.#log('Video loaded from cache', DatadogLogLevel.Info);
    return this.#createObjectUrl(cached);
  }

  async handlePlaybackFailure(detail: string): Promise<void> {
    this.#log(`Video playback failed: ${detail}`, DatadogLogLevel.Error);
    this.#playbackAttempts++;
    if (this.#playbackAttempts < kioskScreensaverMaxPlaybackAttempts) {
      return;
    }
    this.#playbackAttempts = 0;
    const videoUrl: string | null = this.#getVideoUrl();
    if (videoUrl === null || !this.#isCacheStorageAvailable()) {
      return;
    }
    try {
      const cache = await caches.open(kioskScreensaverCacheName);
      await cache.delete(videoUrl);
      this.#log('Cached video discarded after repeated playback failures', DatadogLogLevel.Info);
      void this.#downloadOnce(cache, videoUrl);
    } catch (error) {
      this.#log('Could not discard the cached video', DatadogLogLevel.Warn, error);
    }
  }

  isScreensaverEnabled(): boolean | null {
    return this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.KIOSK_SCREEN_SAVER,
      team: 'b2b-onsite',
    });
  }

  notifyPlaybackStarted(): void {
    this.#playbackAttempts = 0;
  }

  async prefetch(): Promise<void> {
    if (this.isScreensaverEnabled() === true) {
      await this.#getReadyVideo();
    }
  }

  releaseObjectUrl(): void {
    if (this.#objectUrl !== null) {
      URL.revokeObjectURL(this.#objectUrl);
      this.#objectUrl = null;
    }
  }

  async #createObjectUrl(cached: Response): Promise<string | null> {
    this.releaseObjectUrl();
    try {
      this.#objectUrl = URL.createObjectURL(await cached.blob());
      return this.#objectUrl;
    } catch (error) {
      this.#log('Could not read the cached video', DatadogLogLevel.Warn, error);
      return null;
    }
  }

  async #downloadOnce(cache: Cache, videoUrl: string): Promise<void> {
    if (this.#downloading || this.#downloadAttempts >= kioskScreensaverMaxDownloadAttempts) {
      return;
    }
    this.#downloading = true;
    this.#downloadAttempts++;
    try {
      await cache.add(videoUrl);
      this.#downloadAttempts = 0;
      this.#log('Video cached', DatadogLogLevel.Info);
    } catch (error) {
      if (this.#downloadAttempts >= kioskScreensaverMaxDownloadAttempts) {
        this.#log('Video download failed, giving up', DatadogLogLevel.Error, error);
        return;
      }
      this.#log('Video download failed', DatadogLogLevel.Warn, error);
    } finally {
      this.#downloading = false;
    }
  }

  async #getCachedVideo(cache: Cache, videoUrl: string): Promise<Response | undefined> {
    const cached = await cache.match(videoUrl);
    if (cached === undefined) {
      return undefined;
    }
    if (cached.headers.get('content-type')?.startsWith('video/') !== true) {
      await cache.delete(videoUrl);
      this.#log('Cached response is not a video, discarding it', DatadogLogLevel.Warn);
      return undefined;
    }
    return cached;
  }

  async #getReadyVideo(): Promise<Response | undefined> {
    if (!this.#isCacheStorageAvailable()) {
      return undefined;
    }
    const videoUrl: string | null = this.#getVideoUrl();
    if (videoUrl === null) {
      if (!this.#missingVideoUrlWarned) {
        this.#missingVideoUrlWarned = true;
        this.#log('No video url configured in the flag, the screensaver stays off', DatadogLogLevel.Warn);
      }
      return undefined;
    }
    try {
      const cache = await caches.open(kioskScreensaverCacheName);
      const cached = await this.#getCachedVideo(cache, videoUrl);
      if (cached === undefined) {
        void this.#downloadOnce(cache, videoUrl);
        return undefined;
      }
      return cached;
    } catch (error) {
      this.#log('Cache Storage unavailable', DatadogLogLevel.Warn, error);
      return undefined;
    }
  }

  #getVideoUrl(): string | null {
    if (this.#videoUrl === null) {
      const url: string | undefined = this.#getVideoVariable()?.url;
      this.#videoUrl = typeof url === 'string' && url.startsWith('http') ? url : null;
    }
    return this.#videoUrl;
  }

  #getVideoVariable(): { screensaverLogo?: string; screensaverLogoWidth?: number | string; url?: string } | null {
    return this.#optimizelyService.getFeatureVariableJSON<{
      screensaverLogo?: string;
      screensaverLogoWidth?: number | string;
      url?: string;
    }>(FeatureFlags.KIOSK_SCREEN_SAVER, 'video');
  }

  #isCacheStorageAvailable(): boolean {
    if (typeof caches !== 'undefined') {
      return true;
    }
    if (!this.#cacheUnavailableWarned) {
      this.#cacheUnavailableWarned = true;
      this.#log('Cache Storage is not available (insecure context?)', DatadogLogLevel.Warn);
    }
    return false;
  }

  #log(message: string, level: string, error?: unknown): void {
    this.#kioskService.logTrace(`[Screensaver] ${message}`, level, {
      ...(error !== undefined && { error: String(error) }),
      download_attempts: this.#downloadAttempts,
      url: this.#getVideoUrl(),
    });
  }
}
