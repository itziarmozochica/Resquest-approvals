import { Dialog } from '@angular/cdk/dialog';
import { afterNextRender, Component, DestroyRef, inject, Injector, NgZone, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { datadogRum } from '@datadog/browser-rum-slim';
import { KioskPlanDetail, KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { KioskLanguageService } from '@fz-original/app/modules/kiosk/services/kiosk-language.service';
import { KioskStorageService } from '@fz-original/app/modules/kiosk/services/kiosk-storage.service';
import { fadeAnimation } from '@fz-original/app/shared/animations/fade.animation';
import { TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, Observable } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';

import { DatadogLogLevel } from '../../../../core/error/datadog/logger/datadog-log.service';
import { ClickKioskTicketingData, ClickKioskTicketingEvent } from '../../../../core/tracking/core/events/click-kiosk-ticketing';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { IdleService } from '../../services/idle/idle.service';
import { KioskService } from '../../services/kiosk.service';
import { KioskNavigationService } from '../../shared/kiosk-navigation.service';
import { KioskErrorModalComponent } from './../../shared/components/modals/kiosk-error/kiosk-error-modal.component';

@Component({
  animations: [fadeAnimation],
  selector: 'app-kiosk-plan-detail',
  standalone: false,
  styleUrls: ['../../styles/main.scss', './kiosk-plan-detail.component.scss'],
  templateUrl: './kiosk-plan-detail.component.html',
})
export class KioskPlanDetailComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #kioskStorageService = inject(KioskStorageService);
  readonly #dialog = inject(Dialog);
  readonly #idleService = inject(IdleService);
  readonly #injector = inject(Injector);
  readonly #kioskLanguageService = inject(KioskLanguageService);
  readonly #kioskNavigationService = inject(KioskNavigationService);
  readonly #kioskService = inject(KioskService);
  readonly #ngZone = inject(NgZone);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #trackingService = inject(TrackingService);
  readonly #translateService = inject(TranslateService);
  get badgeText(): string | undefined {
    return this.kioskPlan?.is_purchasable === false ? this.#translateService.instant('kiosk.soldOutBadge') : undefined;
  }

  get galleryClass(): string {
    const imageCount = this.galleryImages.length;
    if (imageCount === 2) return 'gallery-two-images';
    if (imageCount === 3) return 'gallery-three-images';
    return '';
  }

  get galleryImages(): string[] {
    return this.kioskPlanDetail?.gallery?.slice(0, 3) ?? [];
  }

  get isSoldOut(): boolean {
    return this.kioskPlan?.is_purchasable === false;
  }

  get title(): string {
    return this.kioskPlanDetail === null ? '' : this.kioskPlanDetail.name;
  }

  isLoading: WritableSignal<boolean> = signal<boolean>(true);
  kioskPlan: KioskPlanItem | null = this.#router.getCurrentNavigation()?.extras?.state?.['plan'] || null;
  kioskPlanDetail: KioskPlanDetail | null = null;
  #renderedTimingSent = false;

  constructor() {
    this.#kioskService.logTrace('Loading Detail', DatadogLogLevel.Info);
    this.#idleService
      .get(60)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#kioskNavigationService.navigateHome());

    this.#translateService.onLangChange
      .pipe(
        startWith({ lang: this.#translateService.currentLang }),
        takeUntilDestroyed(this.#destroyRef),
        distinctUntilChanged((prev, curr) => prev.lang === curr.lang),
        switchMap(event => this.#loadPlan(event.lang).pipe(map(planDetail => ({ lang: event.lang, planDetail })))),
      )
      .subscribe(({ lang, planDetail }) => {
        this.kioskPlanDetail = planDetail;
        this.isLoading.set(false);
        this.#markRendered();
        this.#prefetchOtherLanguages(lang);
      });
  }

  onBackClicked() {
    this.#kioskNavigationService.navigateHome();
  }

  onContinueClicked(kioskPlanDetail: KioskPlanDetail | null) {
    if (kioskPlanDetail !== null) {
      this.#trackingService.track(new ClickKioskTicketingEvent(this.#createTicketingEventData(kioskPlanDetail)));
      this.#kioskNavigationService.navigateTicketing(kioskPlanDetail);
    }
  }

  #createTicketingEventData(plan: KioskPlanDetail): ClickKioskTicketingData {
    return {
      planId: String(plan.id),
      venueId: String(plan.place.id),
      cityId: String(plan.place.city?.standard_id ?? plan.place.city?.id),
    };
  }

  #markRendered(): void {
    if (this.#renderedTimingSent) {
      return;
    }
    this.#renderedTimingSent = true;
    afterNextRender(() => datadogRum.addTiming('kiosk_plan_detail_rendered'), { injector: this.#injector });
  }

  #prefetchOtherLanguages(currentLanguage: string): void {
    const otherLanguages = this.#kioskLanguageService.getLanguageCodes().filter(lang => lang !== currentLanguage);
    if (otherLanguages.length === 0) {
      return;
    }
    const planId: string = this.#route.snapshot.queryParams.planId;
    const channelId = this.#kioskStorageService.getChannelId();
    this.#ngZone.runOutsideAngular(() => {
      otherLanguages.forEach(lang => this.#kioskService.prefetchKioskPlanDetail(planId, lang, channelId, false));
    });
  }

  #loadPlan(lang: string = this.#translateService.currentLang): Observable<KioskPlanDetail> {
    return this.#kioskService
      .getKioskPlanDetail(this.#route.snapshot.queryParams.planId, lang, this.#kioskStorageService.getChannelId())
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        catchError(error => {
          this.isLoading.set(false);
          this.#kioskService.logTrace(error?.message, DatadogLogLevel.Warn);
          const dialog = this.#dialog.open(KioskErrorModalComponent, {
            data: {
              title: this.#translateService.instant('common.errorTitle'),
              messages: ['Check the plan is published in the kiosk channel.'],
            },
          });
          dialog.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
            this.#kioskNavigationService.navigateHome();
          });
          return EMPTY;
        }),
      );
  }
}
