import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { ClickKioskPlanDetailEvent } from '@fz-original/app/core/tracking/core/events/click-kiosk-plan-detail';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { KioskCategoryGroup } from '@fz-original/app/modules/kiosk/models/kiosk-category-group.model';
import { KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { KioskLanguageService } from '@fz-original/app/modules/kiosk/services/kiosk-language.service';
import { KioskStorageService } from '@fz-original/app/modules/kiosk/services/kiosk-storage.service';
import { KioskService } from '@fz-original/app/modules/kiosk/services/kiosk.service';
import { KioskScreensaverService } from '@fz-original/app/modules/kiosk/services/screensaver/kiosk-screensaver.service';
import { ActionFooterComponent } from '@fz-original/app/modules/kiosk/shared/components/action-footer/action-footer.component';
import { KioskButtonComponent } from '@fz-original/app/modules/kiosk/shared/components/button/kiosk-button.component';
import { KioskHeroComponent } from '@fz-original/app/modules/kiosk/shared/components/kiosk-hero/kiosk-hero.component';
import { KioskPlanSquareItemComponent } from '@fz-original/app/modules/kiosk/shared/components/kiosk-plan-square-item/kiosk-plan-square-item.component';
import { KioskNavigationService } from '@fz-original/app/modules/kiosk/shared/kiosk-navigation.service';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { LangChangeEvent, TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY } from 'rxjs';
import { catchError, distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-kiosk-category-plans',
  templateUrl: './kiosk-category-plans.component.html',
  styleUrls: ['../../styles/main.scss', './kiosk-category-plans.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ActionFooterComponent, TranslateModule, KioskButtonComponent, KioskHeroComponent, KioskPlanSquareItemComponent],
})
export class KioskCategoryPlansComponent implements OnInit {
  readonly #cdr = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #kioskLanguageService = inject(KioskLanguageService);
  readonly #kioskNavigationService = inject(KioskNavigationService);
  readonly #kioskScreensaverService = inject(KioskScreensaverService);
  readonly #kioskService = inject(KioskService);
  readonly #kioskStorageService = inject(KioskStorageService);
  readonly #partnerService = inject(PartnerService);
  readonly #route = inject(ActivatedRoute);
  readonly #spinnerService = inject(SpinnerService);
  readonly #trackingService = inject(TrackingService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  categoryName: string | null = null;
  categoryDescription: string | null = null;
  plans: KioskPlanItem[] = [];
  protected readonly uiRefreshEnabled: boolean = this.#kioskScreensaverService.isScreensaverEnabled() === true;

  ngOnInit(): void {
    const categoryId = this.#route.snapshot.paramMap.get('categoryId');
    const partnerId = this.#partnerService.getPartner()?.id;
    const kioskConfiguration = this.#kioskStorageService.getConfiguration();
    const onsiteSetup = this.#kioskStorageService.getOnsiteSetup();

    if (!categoryId || partnerId === undefined || kioskConfiguration === null || onsiteSetup === null) {
      this.#kioskNavigationService.navigateHome();
      return;
    }

    const initialLang = this.#kioskLanguageService.getLanguageCode() ?? onsiteSetup.available_languages[0];

    this.#spinnerService.show();
    this.#translateService.onLangChange
      .pipe(
        distinctUntilChanged((prev: LangChangeEvent, curr: LangChangeEvent) => prev.lang === curr.lang),
        startWith({ lang: initialLang } as LangChangeEvent),
        switchMap((event: LangChangeEvent) =>
          this.#kioskService.getKioskGroupedPlans(partnerId, kioskConfiguration.id, event.lang, undefined, categoryId).pipe(
            catchError(() => {
              this.#spinnerService.hide();
              this.#kioskNavigationService.navigateHome();
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((groups: KioskCategoryGroup[]) => {
        const group = this.#kioskService.excludeSoldOutGroups(groups)[0];
        if (!group) {
          this.#spinnerService.hide();
          this.#kioskNavigationService.navigateHome();
          return;
        }
        this.categoryName = group.category.name;
        this.categoryDescription = group.category.description;
        this.plans = group.plans;
        this.#spinnerService.hide();
        this.#cdr.detectChanges();
      });
  }

  onPlanClicked(plan: KioskPlanItem): void {
    this.#trackingService.track(new ClickKioskPlanDetailEvent({ planId: String(plan.id) }));
    this.#kioskNavigationService.navigatePlanDetail(plan);
  }

  onBackClicked(): void {
    this.#kioskNavigationService.navigateHome();
  }

  isKioskEmulatedInFZ(): boolean {
    return !this.#userService.isKioskUser();
  }
}
