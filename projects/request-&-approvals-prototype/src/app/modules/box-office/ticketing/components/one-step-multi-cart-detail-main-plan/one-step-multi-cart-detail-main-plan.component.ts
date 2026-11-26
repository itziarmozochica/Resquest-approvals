import { CommonModule, KeyValue, KeyValuePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { Place } from '@fz-original/app/shared/models/plan/place.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { MomentDatePipe } from '@fz-original/app/shared/pipes/moment-date.pipe';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, tap } from 'rxjs';

import { OneStepMultiCartDetailSessionsComponent } from '../one-step-multi-cart-detail-sessions/one-step-multi-cart-detail-sessions.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    OneStepMultiCartDetailSessionsComponent,
    KeyValuePipe,
    SharedComponentsModule,
    IconsModule,
    TranslateModule,
    NgTemplateOutlet,
    PipesModule,
  ],
  providers: [MomentDatePipe],
  selector: 'app-one-step-multi-cart-detail-main-plan',
  standalone: true,
  styleUrls: ['./one-step-multi-cart-detail-main-plan.component.scss'],
  templateUrl: './one-step-multi-cart-detail-main-plan.component.html',
})
export class OneStepMultiCartDetailMainPlanComponent implements OnChanges {
  @Input() mainPlanId!: number;
  @Input() mainPlanCartSessionsByDatetime!: Map<string, CartSession[]>;
  @Input() hideMainPlan = false;

  @Output() goToMainPlanClicked: EventEmitter<number> = new EventEmitter<number>();

  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  #momentDatePipe = inject(MomentDatePipe);
  #partnerService: PartnerService = inject(PartnerService);
  #planService: PlanService = inject(PlanService);
  #translateService = inject(TranslateService);

  private partner: Partner | null = this.#partnerService.getPartner();

  mainPlan: Plan | null = null;
  venue: WritableSignal<Place | null> = signal<Place | null>(null);

  loadingMainPlan = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mainPlanId']) {
      this.loadingMainPlan = true;
      this.#loadPlan();
    }
  }

  goToMainPlan(): void {
    this.goToMainPlanClicked.emit(this.mainPlanId);
  }

  trackByIndex(index: number): number {
    return index;
  }

  #loadPlan(): void {
    if (this.partner === null) {
      return;
    }

    this.#planService
      .getPlan(this.partner.id, this.mainPlanId)
      .pipe(
        tap((response: BaseResponse<Plan | null>) => {
          if (response.data) {
            this.mainPlan = response.data;
            if (response.data.places && response.data.places.length > 0) {
              this.venue.set(response.data.places[0]);
            }
            this.#changeDetectorRef.markForCheck();
            this.loadingMainPlan = false;
          }
        }),
        catchError(() => {
          console.error(`Failed to load plan with ID: ${this.mainPlanId}`);
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  getLabelForDatetimeSessions(sessions: KeyValue<string, CartSession[]>): string {
    const firstCartSession: CartSession | null = sessions.value.length !== 0 ? sessions.value[0] : null;
    const timezone = firstCartSession?.sessionTimezone || undefined;
    const locale = this.#translateService.currentLang || '';
    return this.#momentDatePipe.transform(sessions.key, 'EEE, MMM d, y h:mm a', timezone, locale) ?? '';
  }
}
