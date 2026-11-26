import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injector,
  NgZone,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { datadogRum } from '@datadog/browser-rum-slim';
import { isJest } from '@fz-original/app/app/test/is-jest';
import { KioskCategoryGroup } from '@fz-original/app/modules/kiosk/models/kiosk-category-group.model';
import { KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { KioskLanguageService } from '@fz-original/app/modules/kiosk/services/kiosk-language.service';
import { KioskService } from '@fz-original/app/modules/kiosk/services/kiosk.service';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntDialogService } from '@ignite/common';
import { timer } from 'rxjs';
import { take } from 'rxjs/operators';

import packageJson from '../../../../../../package.json';
import { DatadogLogLevel } from '../../../../core/error/datadog/logger/datadog-log.service';
import { ClickKioskPlanDetailEvent } from '../../../../core/tracking/core/events/click-kiosk-plan-detail';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { SpinnerService } from '../../../../shared/layout/spinner/spinner.service';
import { KioskAppParams } from '../../models/kiosk-app-params.model';
import { IdleService } from '../../services/idle/idle.service';
import { KioskStorageService } from '../../services/kiosk-storage.service';
import { KioskPlansResult } from '../../services/kiosk.service';
import { KioskScreensaverService } from '../../services/screensaver/kiosk-screensaver.service';
import {
  KioskSerialQrModalComponent,
  KioskSerialQrModalData,
} from '../../shared/components/modals/kiosk-serial-qr/kiosk-serial-qr-modal.component';
import { KioskNavigationService } from '../../shared/kiosk-navigation.service';
import { KioskHomeDataService } from './kiosk-home-data.service';
import { KioskHomeDiagnostics, KioskHomeStatus } from './kiosk-home-diagnostics.model';
import { KioskTerminalPairingService } from './kiosk-terminal-pairing.service';

export type KioskHomeContentTemplate = 'empty' | 'multi' | 'multi-10' | 'multi-category' | 'single' | 'single-carousel' | 'three' | 'two';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-kiosk-home',
  standalone: false,
  styleUrls: ['../../styles/main.scss', './kiosk-home.component.scss'],
  templateUrl: './kiosk-home.component.html',
})
export class KioskHomeComponent implements OnInit {
  static readonly stallTimeoutMs = 10000;
  static readonly prefetchedPlanDetails = 3;
  static readonly uiRefreshClass = 'kiosk-ui-refresh';
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #document = inject(DOCUMENT);
  readonly #idleService = inject(IdleService);
  readonly #injector = inject(Injector);
  readonly #kioskHomeDataService = inject(KioskHomeDataService);
  readonly #kioskLanguageService = inject(KioskLanguageService);
  readonly #kioskNavigationService = inject(KioskNavigationService);
  readonly #kioskScreensaverService = inject(KioskScreensaverService);
  readonly #kioskService = inject(KioskService);
  readonly #kioskStorageService = inject(KioskStorageService);
  readonly #kioskTerminalPairingService = inject(KioskTerminalPairingService);
  readonly #ngZone = inject(NgZone);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #spinnerService = inject(SpinnerService);
  readonly #trackingService = inject(TrackingService);
  readonly #userService = inject(UserService);
  androidAppVersion: string | undefined;
  androidKioskSerial: string | undefined;
  categoryGroups: WritableSignal<KioskCategoryGroup[]> = signal([]);
  contentTemplate: WritableSignal<KioskHomeContentTemplate> = signal('empty');
  diagnostics: WritableSignal<KioskHomeDiagnostics | null> = signal(null);
  fzVersion: string = isJest() ? '0.0.0' : packageJson.version;
  homeStatus: WritableSignal<KioskHomeStatus> = signal('loading');
  plans: WritableSignal<KioskPlanItem[]> = signal([]);
  singlePlanName: WritableSignal<string> = signal('');

  #appliedResult: KioskPlansResult | null = null;
  #lastSinglePlanCarouselKey: string | null = null;
  #lastSinglePlanEmptyKey: string | null = null;
  #renderedTimingSent = false;

  constructor() {
    this.#setOptimizelyDeviceId();
    this.#kioskTerminalPairingService.start();
    this.#resetIdleService();
    this.#checkForUpdates();
    this.#spinnerService.show();
    this.#kioskService.logTrace('Loading Home', DatadogLogLevel.Info);
    const appParams: KioskAppParams | null = this.#kioskStorageService.getAppParams();
    if (appParams != null) {
      this.androidAppVersion = appParams.appVersion;
      this.androidKioskSerial = appParams.serial;
      this.#kioskService.logTrace('Kiosk app params loaded', DatadogLogLevel.Info, { app_params_serial: appParams.serial });
    }
  }

  goToManageBooking(): void {
    this.#kioskNavigationService.navigateManageBooking();
  }

  showManageBooking(): boolean {
    return this.#kioskStorageService.getOnsiteSetup()?.show_manage_booking === true;
  }

  isKioskEmulatedInFZ(): boolean {
    return !this.#userService.isKioskUser();
  }

  ngOnInit(): void {
    this.#startStallWatchdog();
    this.#kioskHomeDataService
      .init((error: unknown) => {
        this.#spinnerService.hide();
        const description = this.#describeError(error);
        this.#kioskService.logTrace('Home data pipeline errored', DatadogLogLevel.Error, { error: description });
        this.#reportProblem('error', `Home data pipeline errored: ${description}`);
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: KioskPlansResult) => {
        this.#applyResult(result);
      });
    this.#kioskHomeDataService
      .keepWarm()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: KioskPlansResult) => {
        if (this.homeStatus() !== 'ready') {
          this.#applyResult(result);
        }
        this.#prefetchPlanDetails(true);
      });
  }

  onScreensaverDismissed(): void {
    this.#applyCachedPlans();
  }

  onScreensaverShown(): void {
    this.#applyCachedPlans();
  }

  onImageClicked(index: number): void {
    const plans = this.plans();
    if (plans.length > 0 && index < plans.length) {
      return this.onPlanClicked(plans[index]);
    }
  }

  onPlanClicked(plan: KioskPlanItem): void {
    this.#trackingService.track(
      new ClickKioskPlanDetailEvent({
        planId: String(plan.id),
      }),
    );
    this.#kioskNavigationService.navigatePlanDetail(plan);
  }

  onSerialLongPress(): void {
    const serial = this.androidKioskSerial;
    if (serial == null || serial.length === 0) {
      return;
    }
    const data: KioskSerialQrModalData = { serial };
    this.#dialogService.openModal<void, KioskSerialQrModalData>(KioskSerialQrModalComponent, { data, size: 'sm' });
  }

  onShowAllClicked(categoryId: string): void {
    this.#kioskNavigationService.navigateCategoryAllPlans(categoryId);
  }

  trackCategoryById(index: number, group: KioskCategoryGroup): string {
    return group.category.id ?? `__virtual_${index}`;
  }

  #applyCachedPlans(): void {
    if (this.homeStatus() !== 'ready') {
      return;
    }
    this.#kioskHomeDataService
      .loadCurrentPlans()
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: result => {
          if (JSON.stringify(result) !== JSON.stringify(this.#appliedResult)) {
            this.#applyResult(result);
          }
        },
        error: () => undefined,
      });
  }

  #checkForUpdates(): void {
    this.#kioskService.checkForUpdates().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #resetIdleService(): void {
    this.#idleService.reset();
    this.#idleService.pause();
  }

  #setOptimizelyDeviceId(): void {
    const serial: string | undefined =
      this.#kioskStorageService.getAppParams()?.serial ?? this.#kioskStorageService.getConfiguration()?.serial;
    if (serial !== undefined && serial !== '') {
      this.#optimizelyService.setDeviceId(serial);
    }
  }

  #updatePlanItems(plans: KioskPlanItem[]): void {
    this.#digestPlans(plans);
    this.#spinnerService.hide();
  }

  #updateCategoryGroups(groups: KioskCategoryGroup[]): void {
    this.#digestCategoryGroups(groups);
    this.#spinnerService.hide();
  }

  #digestPlans(plans: KioskPlanItem[]): void {
    if (plans == null) {
      throw new Error('Digested plans cannot be null');
    }
    this.plans.set(plans);

    if (plans.length === 0) {
      this.singlePlanName.set('');
      this.#lastSinglePlanCarouselKey = null;
      this.#lastSinglePlanEmptyKey = null;
      this.contentTemplate.set('empty');
      return;
    }

    const singlePlan = plans.length === 1 ? plans[0] : null;

    if (singlePlan !== null) {
      const kioskImages = singlePlan.kiosk_images ?? [];

      this.singlePlanName.set(singlePlan.name);

      if (singlePlan.kiosk_images?.length === 0) {
        this.#logSinglePlanEmptyImagesOnce(singlePlan.id);
      } else {
        this.#lastSinglePlanEmptyKey = null;
      }

      if (kioskImages.length >= 2) {
        this.#logSinglePlanCarouselSelectionOnce(singlePlan.id, kioskImages.length);
        this.contentTemplate.set('single-carousel');
        return;
      }

      this.#lastSinglePlanCarouselKey = null;
      this.contentTemplate.set('single');
      return;
    }

    this.#lastSinglePlanCarouselKey = null;
    this.#lastSinglePlanEmptyKey = null;

    if (plans.length === 2) {
      this.contentTemplate.set('two');
    } else if (plans.length === 3) {
      this.contentTemplate.set('three');
    } else if (plans.length < 10) {
      this.contentTemplate.set('multi');
    } else {
      this.contentTemplate.set('multi-10');
    }
  }

  #digestCategoryGroups(groups: KioskCategoryGroup[]): void {
    this.categoryGroups.set(groups);
    const curatedCategories = groups.filter(g => g.category.id != null);
    if (curatedCategories.length > 1) {
      this.contentTemplate.set('multi-category');
      return;
    }
    const flatPlans: KioskPlanItem[] = groups.flatMap(g => g.plans);
    this.#digestPlans(flatPlans);
  }

  #logSinglePlanCarouselSelectionOnce(planId: number, kioskImagesLength: number): void {
    const key = `${planId}:${kioskImagesLength}`;
    if (this.#lastSinglePlanCarouselKey === key) {
      return;
    }
    this.#lastSinglePlanCarouselKey = key;
    this.#kioskService.logTrace('Single-plan home selected kiosk image carousel', DatadogLogLevel.Info, {
      plan_id: planId,
      kiosk_images_length: kioskImagesLength,
    });
  }

  #logSinglePlanEmptyImagesOnce(planId: number): void {
    const key = `${planId}:0`;
    if (this.#lastSinglePlanEmptyKey === key) {
      return;
    }
    this.#lastSinglePlanEmptyKey = key;
    this.#kioskService.logTrace('Single-plan home received empty kiosk_images array', DatadogLogLevel.Warn, {
      plan_id: planId,
      kiosk_images_length: 0,
    });
  }

  #applyResult(result: KioskPlansResult): void {
    this.#appliedResult = result;
    this.homeStatus.set('ready');

    this.#setOptimizelyDeviceId();

    this.#applyUiRefreshClass();

    this.diagnostics.set(null);
    if (result.kind === 'groups') {
      this.#updateCategoryGroups(result.payload);
    } else {
      this.#updatePlanItems(result.payload);
    }
    this.#prefetchPlanDetails();
    this.#markRendered();
  }

  #markRendered(): void {
    if (this.#renderedTimingSent) {
      return;
    }
    this.#renderedTimingSent = true;
    afterNextRender(() => datadogRum.addTiming('kiosk_home_rendered'), { injector: this.#injector });
  }

  #plansToPrefetch(): KioskPlanItem[] {
    switch (this.contentTemplate()) {
      case 'single':
      case 'single-carousel':
      case 'two':
      case 'three':
        return this.plans();
      case 'multi':
      case 'multi-10':
        return this.plans().slice(0, KioskHomeComponent.prefetchedPlanDetails);
      default:
        return [];
    }
  }

  #prefetchPlanDetails(revalidateExpired: boolean = false): void {
    const plans = this.#plansToPrefetch();
    if (plans.length === 0) {
      return;
    }
    const languageCodes = this.#kioskLanguageService.getLanguageCodes();
    const currentLanguage = this.#kioskLanguageService.getLanguageCode() ?? languageCodes[0] ?? 'en';
    const languages = plans.length === 1 ? [...new Set([currentLanguage, ...languageCodes])] : [currentLanguage];
    const channelId = this.#kioskStorageService.getChannelId();
    this.#ngZone.runOutsideAngular(() => {
      plans.forEach(plan =>
        languages.forEach(lang => this.#kioskService.prefetchKioskPlanDetail(String(plan.id), lang, channelId, revalidateExpired)),
      );
    });
  }

  // Build a human-readable message from an unknown thrown value: `String(error)`
  // renders objects (e.g. HttpErrorResponse) as "[object Object]" in the banner.
  #describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error != null && typeof error === 'object') {
      if ('error' in error && error.error instanceof HttpErrorResponse) {
        return error.error.message;
      }
      if ('message' in error && typeof error.message === 'string' && error.message.length > 0) {
        return error.message;
      }
      try {
        return JSON.stringify(error);
      } catch {
        return 'Unknown error';
      }
    }
    return String(error);
  }

  #reportProblem(status: Extract<KioskHomeStatus, 'error' | 'stalled'>, reason: string): void {
    if (this.homeStatus() === 'ready') {
      return;
    }
    this.homeStatus.set(status);
    this.diagnostics.set({
      isOnline: navigator.onLine,
      reason,
      serial: this.#kioskStorageService.getConfiguration()?.serial ?? this.androidKioskSerial ?? '—',
    });
  }

  #startStallWatchdog(): void {
    timer(KioskHomeComponent.stallTimeoutMs)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        if (this.homeStatus() !== 'loading') {
          return;
        }
        this.#reportProblem('stalled', `Home did not finish loading within ${KioskHomeComponent.stallTimeoutMs / 1000}s`);
      });
  }

  // Class to gate the temporary visual refresh on some sections of the kiosk flow
  #applyUiRefreshClass(): void {
    this.#document.body.classList.toggle(KioskHomeComponent.uiRefreshClass, this.#kioskScreensaverService.isScreensaverEnabled() === true);
  }
}
