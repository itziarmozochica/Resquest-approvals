import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { STORAGE_SERVICE } from '@fz/storage';
import { classifyVersion, type VersionCheckSignal, type VersionJson } from '@fz/version-check';
import { IGNT_DIALOG_TRANSLATIONS, IgntDialogService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { filter, interval, switchMap, take } from 'rxjs';

import packageJson from '../../../../../package.json';
import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { AppReloadService } from '../app-reload/app-reload.service';
import { AppVersionService } from '../app-version/app-version.service';
import { UserService } from '../user/user.service';

const checkUpdateIntervalMs = 5 * 60 * 1000;
const versionStorageKey = 'fz_version';
const dismissedVersionStorageKey = 'fz_version_dismissed';

@Injectable()
export class VersionCheckService {
  static readonly ssoCallbackCodeParam = 'code';
  static readonly ssoCallbackPath = '/login';
  static readonly kioskPath = '/kiosk';

  readonly #appReload = inject(AppReloadService);
  readonly #appVersion = inject(AppVersionService);
  readonly #datadogLog = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #document = inject(DOCUMENT);
  readonly #injector = inject(Injector);
  readonly #storage = inject(STORAGE_SERVICE);
  readonly #translate = inject(TranslateService);
  readonly #userService = inject(UserService);

  initVersionCheck(): void {
    if (this.#storage.get(versionStorageKey) !== packageJson.version) {
      this.#storage.set(versionStorageKey, packageJson.version);
    }
    if (!this.#userService.isKioskUser() && !this.#isKioskPath() && !this.#isSsoCallback()) {
      this.#appVersion.reloadIfOutdated().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
    }
    interval(checkUpdateIntervalMs)
      .pipe(
        filter(() => !this.#userService.isKioskUser()),
        switchMap(() => this.#appVersion.fetchPublishedVersion()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((response: VersionJson | null) => {
        if (response !== null) {
          this.#handleVersion(response);
        }
      });
  }

  getCurrentVersion(): string {
    return this.#storage.get(versionStorageKey) ?? '';
  }

  #isKioskPath(): boolean {
    const { pathname } = this.#document.location;
    return pathname === VersionCheckService.kioskPath || pathname.startsWith(`${VersionCheckService.kioskPath}/`);
  }

  #isSsoCallback(): boolean {
    const { pathname, search } = this.#document.location;
    return (
      pathname.endsWith(VersionCheckService.ssoCallbackPath) && new URLSearchParams(search).has(VersionCheckService.ssoCallbackCodeParam)
    );
  }

  #handleVersion(response: VersionJson): void {
    if (this.#appVersion.isRolledBack(response)) {
      this.#appVersion.reloadOnce(response);
      return;
    }

    const comparison = classifyVersion(response.version, packageJson.version);

    if (comparison === 'major') {
      this.#appVersion.reloadOnce(response);
      return;
    }

    if (comparison === 'minor' && this.#storage.get(dismissedVersionStorageKey) !== response.version) {
      this.#promptUpdate(response);
    }
  }

  #promptUpdate(response: VersionJson): void {
    this.#emit('version_check.prompt_shown', response);
    const dialogInjectorWithTranslations = Injector.create({
      parent: this.#injector,
      providers: [
        {
          multi: true,
          provide: IGNT_DIALOG_TRANSLATIONS,
          useFactory: () =>
            signal({ cancelButton: this.#translate.instant('common.cancel'), okButton: this.#translate.instant('common.ok') }),
        },
      ],
    });
    const dialogRef = this.#dialogService.openConfirmModal(
      this.#translate.instant('common.update'),
      this.#translate.instant('versionUpdate'),
      { injector: dialogInjectorWithTranslations },
    );

    dialogRef.closed$.pipe(take(1)).subscribe((result: unknown) => {
      if (result === true) {
        this.#emit('version_check.prompt_accepted', response);
        this.#storage.remove(dismissedVersionStorageKey);
        this.#appReload.forceReload();
        return;
      }
      if (result === false) {
        this.#emit('version_check.prompt_dismissed', response);
        this.#storage.set(dismissedVersionStorageKey, response.version);
      }
    });
  }

  #emit(signal: VersionCheckSignal, response: VersionJson): void {
    this.#datadogLog.logInfo(signal, { autosync: response.autosync, version: response.version });
  }
}
