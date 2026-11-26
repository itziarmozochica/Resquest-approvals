import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { MainPlanSettings } from '@fz-original/app/modules/event-settings/models/main-plan-settings.model';
import { MainPlanSettingsService } from '@fz-original/app/modules/event-settings/services/main-plan-settings.service';
import { PlanTermsAndConditionsEditionComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-terms-and-conditions-edition/plan-terms-and-conditions-edition.component';
import { PlanTermsAndConditionsDraftService } from '@fz-original/app/modules/plan/plan-creation/services/plan-terms-and-conditions-draft.service';
import { SentryLoggerService } from '@fz-original/app/shared/services/error-logger/sentry-logger.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, finalize, Observable, of, switchMap, tap } from 'rxjs';

import { WithUnsavedChangesGuardComponent } from '../../../../../shared/models/with-unsaved-changes-guard-component.model';
import { EditingPlanService } from '../../../services/editing-plan/editing-plan.service';

type ComponentState = 'loading' | 'error' | 'ok';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, PlanTermsAndConditionsEditionComponent, TranslateModule],
  selector: 'app-plan-terms-and-conditions-edit',
  standalone: true,
  styleUrl: './plan-terms-and-conditions-edit.component.scss',
  templateUrl: './plan-terms-and-conditions-edit.component.html',
})
export class PlanTermsAndConditionsEditComponent implements OnInit, WithUnsavedChangesGuardComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #editingPlanService = inject(EditingPlanService);
  readonly #mainPlanSettingsService = inject(MainPlanSettingsService);
  readonly #partnerService = inject(PartnerService);
  readonly #planTermsDraft = inject(PlanTermsAndConditionsDraftService);
  readonly #sentryLoggerService = inject(SentryLoggerService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  readonly #state = signal<ComponentState>('loading');
  readonly #planId = signal<number | null>(null);
  readonly #initialHtml = signal<string>('');
  readonly #currentHtml = signal<string>('');
  readonly #isSaving = signal<boolean>(false);

  readonly state: Signal<ComponentState> = this.#state.asReadonly();
  readonly planId: Signal<number | null> = this.#planId.asReadonly();
  readonly htmlContent: Signal<string> = this.#currentHtml.asReadonly();
  readonly isSaving: Signal<boolean> = this.#isSaving.asReadonly();
  readonly canEditPlan: Signal<boolean> = toSignal(this.#editingPlanService.observeCanEditPlan$(), { initialValue: false });

  readonly canSave: Signal<boolean> = computed(
    () => this.#state() === 'ok' && this.canEditPlan() && !this.#isSaving() && this.#currentHtml() !== this.#initialHtml(),
  );

  areChangesUnsaved(): boolean {
    return this.#currentHtml() !== this.#initialHtml();
  }

  ngOnInit(): void {
    this.#editingPlanService
      .getSelectedPlanOption$()
      .pipe(
        tap(() => {
          this.#state.set('loading');
          this.#isSaving.set(false);
        }),
        switchMap(option => {
          const id = option?.id ?? null;
          this.#planId.set(id);
          if (!id) {
            return of(null);
          }
          return this.#loadTerms(id);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  onHtmlContentChange(html: string): void {
    this.#currentHtml.set(html);
    const id = this.#planId();
    if (id !== null) {
      this.#planTermsDraft.setHtml(id, html);
    }
  }

  publish(): void {
    if (!this.canSave()) {
      return;
    }
    const partner = this.#partnerService.getPartner();
    const id = this.#planId();
    if (!partner?.id || id === null) {
      return;
    }

    const html = this.#currentHtml();
    this.#isSaving.set(true);

    this.#mainPlanSettingsService
      .updateMainPlanGeneralSettings(partner.id, id, { requiredPurchaseTerms: html })
      .pipe(
        tap(() => {
          this.#planTermsDraft.setHtml(id, html);
          if (this.#planId() !== id) {
            return;
          }
          this.#initialHtml.set(html);
          this.#toastService.add({
            autoHide: true,
            delay: 3000,
            message: this.#translateService.instant('planEdition.toast.changesSaved'),
            sentiment: AlertSentiment.positive,
          });
        }),
        catchError(() => {
          if (this.#planId() === id) {
            this.#toastService.add({
              autoHide: true,
              delay: 5000,
              message: this.#translateService.instant('planEdition.toast.termsSaveError'),
              sentiment: AlertSentiment.danger,
            });
          }
          return EMPTY;
        }),
        finalize(() => {
          if (this.#planId() === id) {
            this.#isSaving.set(false);
          }
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  retry(): void {
    const id = this.#planId();
    if (id === null) {
      return;
    }
    this.#state.set('loading');
    this.#loadTerms(id).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #loadTerms(planId: number): Observable<Partial<MainPlanSettings> | null> {
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      this.#state.set('error');
      return of(null);
    }

    return this.#mainPlanSettingsService.getMainPlanGeneralSettings(partner.id, planId).pipe(
      tap(settings => {
        if (this.#planId() !== planId) {
          return;
        }
        const html = settings.requiredPurchaseTerms ?? '';
        this.#initialHtml.set(html);
        this.#currentHtml.set(html);
        this.#planTermsDraft.setHtml(planId, html);
        this.#state.set('ok');
      }),
      catchError(() => {
        this.#sentryLoggerService.logWarning('Error loading plan settings for terms and conditions');
        if (this.#planId() === planId) {
          this.#state.set('error');
        }
        return of(null);
      }),
    );
  }
}
