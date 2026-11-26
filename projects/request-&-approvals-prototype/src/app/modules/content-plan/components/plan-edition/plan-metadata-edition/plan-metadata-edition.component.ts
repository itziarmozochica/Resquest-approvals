import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal, Signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { IgntAlertComponent, IgntButtonComponent, IgntToastService } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, combineLatest, distinctUntilChanged, EMPTY, finalize, map, Observable, of, switchMap, tap } from 'rxjs';

import { SelectOption } from '../../../../../shared/layout/filters/select/select.interface';
import { BaseResponse } from '../../../../../shared/models/base-response';
import { PlanDetail } from '../../../../../shared/models/plan/plan-detail.model';
import { WithUnsavedChangesGuardComponent } from '../../../../../shared/models/with-unsaved-changes-guard-component.model';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { Permissions } from '../../../../../shared/services/user/permissions';
import { UserService } from '../../../../../shared/services/user/user.service';
import { PlanMetadata } from '../../../models/plan-metadata.model';
import { EditingPlanService } from '../../../services/editing-plan/editing-plan.service';
import { PlanMetadataService } from '../../../services/plan-metadata/plan-metadata.service';
import { toNullableInteger } from '../../../utils/nullable-integer.util';
import { PlanMetadataControlName, PlanMetadataEditionState, PlanMetadataIntegerControlName } from './plan-metadata-edition.model';
import { integerValidator, isSamePlanMetadata, parsePlanMetadataRejection, readRejectionMessage } from './plan-metadata-edition.util';

const INTEGER_CONTROLS: readonly PlanMetadataIntegerControlName[] = ['programId', 'composerId', 'musicGenre'];

const INVALID_INTEGER_MESSAGE_KEYS: Readonly<Record<PlanMetadataIntegerControlName, string>> = {
  composerId: 'planEdition.metadata.invalidComposerId',
  musicGenre: 'planEdition.metadata.invalidMusicGenre',
  programId: 'planEdition.metadata.invalidProgramId',
};

const EMPTY_METADATA: Readonly<PlanMetadata> = {
  composerId: null,
  composerName: null,
  ensemble: null,
  instrumentation: null,
  musicGenre: null,
  programId: null,
  setlist: null,
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntInputFieldComponent,
    IgntTextareaFieldComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-plan-metadata-edition',
  standalone: true,
  styleUrl: './plan-metadata-edition.component.scss',
  templateUrl: './plan-metadata-edition.component.html',
})
export class PlanMetadataEditionComponent implements WithUnsavedChangesGuardComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #editingPlanService = inject(EditingPlanService);
  readonly #partnerService = inject(PartnerService);
  readonly #planMetadataService = inject(PlanMetadataService);
  readonly #toastService = inject(IgntToastService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  protected readonly form = new FormGroup({
    composerId: new FormControl<number | string | null>(null, { validators: [integerValidator] }),
    composerName: new FormControl<string>('', { nonNullable: true }),
    ensemble: new FormControl<string>('', { nonNullable: true }),
    instrumentation: new FormControl<string>('', { nonNullable: true }),
    musicGenre: new FormControl<number | string | null>(null, { validators: [integerValidator] }),
    programId: new FormControl<number | string | null>(null, { validators: [integerValidator] }),
    setlist: new FormControl<string>('', { nonNullable: true }),
  });

  readonly #state = signal<PlanMetadataEditionState>('loading');
  readonly #planId = signal<number | null>(null);
  readonly #loadedMetadata = signal<PlanMetadata | null>(null);
  readonly #isSaving = signal<boolean>(false);
  readonly #planNotFound = signal<boolean>(false);
  readonly #serverFieldErrors = signal<Partial<Record<PlanMetadataControlName, string>>>({});
  readonly #unmappedErrors = signal<string[]>([]);
  readonly #formRevision = signal<number>(0);
  readonly #canEditPlan: Signal<boolean> = toSignal(this.#editingPlanService.observeCanEditPlan$(), { initialValue: false });
  protected readonly hasEditContentPermission: Signal<boolean> = toSignal(
    this.#userService.observePermissions().pipe(map(() => this.#userService.hasPermission(Permissions.CAN_EDIT_CONTENT))),
    { initialValue: this.#userService.hasPermission(Permissions.CAN_EDIT_CONTENT) },
  );
  readonly #latestSaveIdByPlan = new Map<number, number>();
  #loadRequestId = 0;
  #planSelectionId = 0;
  #saveRequestId = 0;

  protected readonly state: Signal<PlanMetadataEditionState> = this.#state.asReadonly();
  protected readonly planNotFound: Signal<boolean> = this.#planNotFound.asReadonly();
  protected readonly serverFieldErrors: Signal<Partial<Record<PlanMetadataControlName, string>>> = this.#serverFieldErrors.asReadonly();
  protected readonly unmappedErrors: Signal<string[]> = this.#unmappedErrors.asReadonly();

  readonly #isDirty: Signal<boolean> = computed(() => {
    this.#formRevision();
    const loaded = this.#loadedMetadata();
    if (loaded === null) {
      return false;
    }
    return this.#firstInvalidIntegerControl() !== null || !isSamePlanMetadata(this.#buildPayload(), loaded);
  });

  readonly #canEditMetadata: Signal<boolean> = computed(() => this.#canEditPlan() && this.hasEditContentPermission());

  protected readonly canSave: Signal<boolean> = computed(
    () => this.state() === 'ok' && this.#canEditMetadata() && !this.#isSaving() && this.#isDirty(),
  );
  protected readonly canDiscard: Signal<boolean> = computed(() => this.state() === 'ok' && !this.#isSaving() && this.#isDirty());

  readonly #isFormLocked: Signal<boolean> = computed(() => !this.#canEditMetadata() || this.#isSaving());

  constructor() {
    effect(() => {
      const isLocked = this.#isFormLocked();
      untracked(() => this.#applyFormLock(isLocked));
    });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#formRevision.update(revision => revision + 1));

    combineLatest([this.#editingPlanService.getSelectedPlanOption$(), this.#editingPlanService.getSelectedPlanDetail$()])
      .pipe(
        map(([option, detail]) => this.#toCandlelightPlanId(option, detail)),
        distinctUntilChanged(),
        switchMap(planId => this.#loadSelectedPlan(planId)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  areChangesUnsaved(): boolean {
    return this.#isDirty();
  }

  protected discard(): void {
    const loaded = this.#loadedMetadata();
    if (loaded === null) {
      return;
    }
    this.#resetFormTo(loaded);
    this.#clearRejection();
  }

  protected retry(): void {
    this.#loadSelectedPlan(this.#planId()).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  protected save(): void {
    if (!this.canSave()) {
      return;
    }

    this.#clearRejection();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.#formRevision.update(revision => revision + 1);
      const invalidControl = this.#firstInvalidIntegerControl();
      this.#showDangerToast(invalidControl === null ? 'planEdition.metadata.invalidFields' : INVALID_INTEGER_MESSAGE_KEYS[invalidControl]);
      return;
    }

    const partner = this.#partnerService.getPartner();
    const planId = this.#planId();
    if (partner === null || planId === null) {
      return;
    }

    const payload = this.#buildPayload();
    const saveRequestId = ++this.#saveRequestId;
    const planSelectionId = this.#planSelectionId;
    this.#latestSaveIdByPlan.set(planId, saveRequestId);
    const isLatestSaveOfShownPlan = (): boolean => this.#planId() === planId && this.#latestSaveIdByPlan.get(planId) === saveRequestId;
    const isFormStillHoldingSave = (): boolean => isLatestSaveOfShownPlan() && planSelectionId === this.#planSelectionId;
    const hasEditsMadeAfterReselection = (): boolean => planSelectionId !== this.#planSelectionId && this.#isDirty();
    this.#isSaving.set(true);

    this.#planMetadataService
      .updatePlanMetadata(partner.id, planId, payload)
      .pipe(
        switchMap(() => {
          if (!isLatestSaveOfShownPlan() || hasEditsMadeAfterReselection()) {
            this.#showChangesSavedToast();
            return EMPTY;
          }
          this.#applyLoadedMetadata(payload);
          return this.#reloadAfterSave(partner.id, planId);
        }),
        catchError((error: unknown) => {
          if (isFormStillHoldingSave()) {
            this.#isSaving.set(false);
            this.#applyFormLock(this.#isFormLocked());
            this.#handleSaveError(error);
          } else {
            this.#showDangerToast('planEdition.metadata.saveError');
          }
          return EMPTY;
        }),
        finalize(() => {
          if (isLatestSaveOfShownPlan()) {
            this.#isSaving.set(false);
          }
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #applyFormLock(isLocked: boolean): void {
    if (isLocked === this.form.disabled) {
      return;
    }
    if (isLocked) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
    this.#formRevision.update(revision => revision + 1);
  }

  #applyLoadedMetadata(metadata: PlanMetadata): void {
    this.#loadedMetadata.set(metadata);
    this.#resetFormTo(metadata);
    this.#clearRejection();
    this.#state.set('ok');
  }

  #applyServerFieldErrors(fieldErrors: Partial<Record<PlanMetadataControlName, string>>): void {
    this.#serverFieldErrors.set(fieldErrors);
    Object.entries(fieldErrors).forEach(([controlName, message]) => {
      if (message !== undefined) {
        const control = this.form.get(controlName);
        control?.markAsTouched();
        control?.setErrors({ server: message });
      }
    });
    this.#formRevision.update(revision => revision + 1);
  }

  #buildPayload(): PlanMetadata {
    const raw = this.form.getRawValue();
    return {
      composerId: toNullableInteger(raw.composerId),
      composerName: this.#toNullable(raw.composerName),
      ensemble: this.#toNullable(raw.ensemble),
      instrumentation: this.#toNullable(raw.instrumentation),
      musicGenre: toNullableInteger(raw.musicGenre),
      programId: toNullableInteger(raw.programId),
      setlist: this.#toNullable(raw.setlist),
    };
  }

  #clearRejection(): void {
    Object.values(this.form.controls).forEach(control => {
      if (control.hasError('server')) {
        control.updateValueAndValidity();
      }
    });
    this.#serverFieldErrors.set({});
    this.#unmappedErrors.set([]);
    this.#planNotFound.set(false);
  }

  #firstInvalidIntegerControl(): PlanMetadataIntegerControlName | null {
    return INTEGER_CONTROLS.find(controlName => this.form.controls[controlName].invalid) ?? null;
  }

  #handleSaveError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.#showDangerToast('planEdition.metadata.saveError');
      return;
    }

    if (error.status === 403 || error.status === 404) {
      this.#planNotFound.set(true);
      return;
    }

    if (error.status === 400) {
      const rejection = parsePlanMetadataRejection(readRejectionMessage(error.error));
      if (Object.keys(rejection.fieldErrors).length === 0 && rejection.unmappedErrors.length === 0) {
        this.#showDangerToast('planEdition.metadata.saveError');
        return;
      }
      this.#applyServerFieldErrors(rejection.fieldErrors);
      this.#unmappedErrors.set(rejection.unmappedErrors);
      this.#showDangerToast('planEdition.metadata.invalidFields');
      return;
    }

    this.#showDangerToast('planEdition.metadata.saveError');
  }

  #loadMetadata(partnerId: number, planId: number): Observable<PlanMetadata | null> {
    const requestId = ++this.#loadRequestId;

    return this.#planMetadataService.getPlanMetadata(partnerId, planId).pipe(
      tap(metadata => {
        if (requestId === this.#loadRequestId) {
          this.#applyLoadedMetadata(metadata);
        }
      }),
      catchError((error: unknown) => {
        if (requestId !== this.#loadRequestId) {
          return of(null);
        }
        const isNotFound = error instanceof HttpErrorResponse && error.status === 404;
        this.#planNotFound.set(isNotFound);
        this.#state.set(isNotFound ? 'notFound' : 'error');
        return of(null);
      }),
    );
  }

  #loadSelectedPlan(planId: number | null): Observable<PlanMetadata | null> {
    this.#loadRequestId += 1;
    this.#planSelectionId += 1;
    this.#planId.set(planId);
    this.#state.set('loading');
    this.#isSaving.set(false);
    this.#loadedMetadata.set(null);
    this.#clearRejection();
    this.#resetFormTo(EMPTY_METADATA);

    if (planId === null) {
      return of(null);
    }

    const partner = this.#partnerService.getPartner();
    if (partner === null) {
      this.#state.set('error');
      return of(null);
    }

    return this.#loadMetadata(partner.id, planId);
  }

  #reloadAfterSave(partnerId: number, planId: number): Observable<void> {
    const requestId = ++this.#loadRequestId;

    return this.#planMetadataService.getPlanMetadata(partnerId, planId).pipe(
      tap(metadata => {
        if (requestId === this.#loadRequestId) {
          this.#applyLoadedMetadata(metadata);
        }
      }),
      map((): void => undefined),
      catchError((): Observable<void> => of(undefined)),
      tap(() => this.#showChangesSavedToast()),
    );
  }

  #resetFormTo(metadata: PlanMetadata): void {
    this.form.reset({
      composerId: metadata.composerId,
      composerName: metadata.composerName ?? '',
      ensemble: metadata.ensemble ?? '',
      instrumentation: metadata.instrumentation ?? '',
      musicGenre: metadata.musicGenre,
      programId: metadata.programId,
      setlist: metadata.setlist ?? '',
    });
    this.#formRevision.update(revision => revision + 1);
  }

  #showChangesSavedToast(): void {
    this.#toastService.positive(this.#translateService.instant('planEdition.toast.changesSaved'));
  }

  #showDangerToast(messageKey: string): void {
    this.#toastService.danger(this.#translateService.instant(messageKey));
  }

  #toCandlelightPlanId(option: SelectOption | null | undefined, detail: BaseResponse<PlanDetail>): number | null {
    const plan = detail.data;
    if (option === null || option === undefined || plan === null || plan.id !== option.id || !plan.isCandlelight) {
      return null;
    }
    return plan.id;
  }

  #toNullable(value: string): string | null {
    return value === '' ? null : value;
  }
}
