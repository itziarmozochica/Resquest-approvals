import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { STORAGE_SERVICE } from '@fz/storage';
import { isNewerVersion, isVersionJson, type VersionJson } from '@fz/version-check';
import { catchError, finalize, map, Observable, of, shareReplay, timeout } from 'rxjs';

import packageJson from '../../../../../package.json';
import { BAKED_COMMIT } from '../../../../environments/build-info';
import { environment } from '../../../../environments/environment';
import { StorageKey } from '../../../app/enums/storage.enum';
import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { AppReloadService } from '../app-reload/app-reload.service';
import type { ReloadAttempt } from './reload-attempt.model';
import { ReloadTiming } from './reload-timing.enum';

@Injectable({
  providedIn: 'root',
})
export class AppVersionService {
  static readonly commitHashPattern = /^[0-9a-f]{40}$/u;
  static readonly fetchTimeoutMs = 3000;
  static readonly reloadAttemptKey = StorageKey.versionReloadAttempt;
  static readonly reloadGuardMs = 60 * 1000;
  static readonly runningVersion: string = packageJson.version;

  readonly #appReload = inject(AppReloadService);
  readonly #datadogLog = inject(DatadogLogService);
  readonly #http = inject(HttpClient);
  readonly #storage = inject(STORAGE_SERVICE);
  #pendingCheck: Observable<boolean> | null = null;
  #isReloadScheduled = false;

  fetchPublishedVersion(): Observable<VersionJson | null> {
    return this.#http.get<unknown>(`${environment.baseUrl}/version.json?t=${Date.now()}`).pipe(
      timeout(AppVersionService.fetchTimeoutMs),
      map((response: unknown) => (isVersionJson(response) ? response : null)),
      catchError(() => of(null)),
    );
  }

  fetchVersionToReloadFor(): Observable<VersionJson | null> {
    if (!environment.checkVersion) {
      return of(null);
    }
    return this.fetchPublishedVersion().pipe(
      map((published: VersionJson | null) =>
        published !== null && (this.isRolledBack(published) || isNewerVersion(published.version, AppVersionService.runningVersion))
          ? published
          : null,
      ),
    );
  }

  reloadIfOutdated(): Observable<boolean> {
    if (!environment.checkVersion) {
      return of(false);
    }
    if (this.#isReloadScheduled) {
      return of(true);
    }
    this.#pendingCheck ??= this.fetchVersionToReloadFor().pipe(
      map((published: VersionJson | null) => published !== null && this.reloadOnce(published)),
      finalize(() => {
        this.#pendingCheck = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.#pendingCheck;
  }

  isRolledBack(published: VersionJson): boolean {
    return !published.autosync && AppVersionService.commitHashPattern.test(BAKED_COMMIT) && published.hash !== BAKED_COMMIT;
  }

  reloadOnce(published: VersionJson, timing: ReloadTiming = ReloadTiming.Deferred): boolean {
    if (this.#isReloadScheduled) {
      return true;
    }
    const payload = { autosync: published.autosync, hash: published.hash, version: published.version };
    const target: string = this.isRolledBack(published) ? published.hash : published.version;
    if (this.#wasJustReloadedFor(target)) {
      this.#datadogLog.logInfo('version_check.reload_skipped', payload);
      return false;
    }
    this.#storage.set<ReloadAttempt>(AppVersionService.reloadAttemptKey, { reloadedAt: Date.now(), target });
    this.#datadogLog.logInfo('version_check.forced_reload', payload);
    this.#isReloadScheduled = true;
    if (timing === ReloadTiming.Immediate) {
      this.#appReload.reloadNow();
    } else {
      this.#appReload.forceReload();
    }
    return true;
  }

  #wasJustReloadedFor(target: string): boolean {
    const attempt: ReloadAttempt | null = this.#storage.get<ReloadAttempt>(AppVersionService.reloadAttemptKey);
    return attempt?.target === target && Date.now() - attempt.reloadedAt < AppVersionService.reloadGuardMs;
  }
}
