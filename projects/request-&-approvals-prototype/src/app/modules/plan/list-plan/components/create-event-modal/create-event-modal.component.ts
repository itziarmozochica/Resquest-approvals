import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  Signal,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SharedComponentsModule } from '../../../../../shared/components/shared-components.module';
import { SelectOption } from '../../../../../shared/layout/filters/select/select.interface';
import { Venue } from '../../../../../shared/models/plan/plan-detail.model';
import { PlanKind } from '../../../../../shared/models/plan/plan-kind.enum';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { CreateMainPlanPayload, CreateMainPlanService } from '../../../../../shared/services/plan/create-main-plan.service';
import { ToastService, ToastType } from '../../../../../shared/services/toast/toast.service';
import { CreateVenueFormComponent } from '../../../../venues/components/create-venue-form/create-venue-form.component';
import { clickCloseCreateEventModal } from '../../../tracking/events/click-close-create-event-modal.event';
import { clickOpenCreateEventModal } from '../../../tracking/events/click-open-create-event-modal.event';
import { createEvent } from '../../../tracking/events/create-event.event';
import { PlanSelectComponent } from './components/plan-select/plan-select.component';
import { VenueSelectComponent } from './components/venue-select/venue-select.component';
import { CreateEventFormData, CreateEventType } from './create-event.model';
import { CreateEventTypeService } from './services/create-event-type.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PlanSelectComponent,
    CommonModule,
    CreateVenueFormComponent,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntInputFieldComponent,
    IgntTypeaheadModule,
    ReactiveFormsModule,
    SharedComponentsModule,
    TranslateModule,
    VenueSelectComponent,
  ],
  selector: 'app-create-event-modal',
  standalone: true,
  styleUrls: ['./create-event-modal.component.scss'],
  templateUrl: './create-event-modal.component.html',
})
export class CreateEventModalComponent implements OnInit {
  readonly #createEventTypeService = inject(CreateEventTypeService);
  readonly #createMainPlanService = inject(CreateMainPlanService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #formBuilder = inject(FormBuilder);
  readonly #partnerService = inject(PartnerService);
  readonly #toastService = inject(ToastService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #translateService = inject(TranslateService);
  readonly #optimizelyService = inject(OptimizelyService);

  form: FormGroup = this.#formBuilder.group({
    catalogPlanId: [null],
    title: ['', [Validators.required]],
    type: [null, [Validators.required]],
    venueId: [null, [Validators.required]],
  });

  planSelect = viewChild(PlanSelectComponent);
  venueSelect = viewChild(VenueSelectComponent);
  protected readonly partnersSupportEmail = 'partners@example.com';
  protected readonly planKindStandard = PlanKind.STANDARD;
  selectedTypeOption = signal<SelectOption | undefined>(undefined);
  isShowcaseType: Signal<boolean> = computed(() => this.selectedTypeOption()?.id === 'showcase');
  isOpen: WritableSignal<boolean> = signal(false);
  isCreatingVenue: WritableSignal<boolean> = signal(false);
  isCreatingVenueSaving: WritableSignal<boolean> = signal(false);
  isSaving: WritableSignal<boolean> = signal(false);
  isTypePreset: WritableSignal<boolean> = signal(false);
  typeOptions: WritableSignal<SelectOption[]> = signal([]);

  get canPickShowcaseVenue(): boolean {
    return this.#optimizelyService.isFeatureEnabled(FeatureFlags.SHOWCASE_PLAN_VENUE) ?? false;
  }

  close(options: { trackClose?: boolean } = {}): void {
    const trackClose = options.trackClose ?? true;
    if (trackClose && this.isOpen()) {
      this.#fzTracking.track(clickCloseCreateEventModal());
    }
    this.isOpen.set(false);
    const titleControl = this.form.get('title');
    if (titleControl) {
      titleControl.clearValidators();
    }
    this.form.reset();
    if (titleControl) {
      titleControl.setValidators([Validators.required]);
      titleControl.updateValueAndValidity({ emitEvent: false });
    }
    this.#updateLocationValidators(null);
    this.#resetFormState();
    this.venueSelect()?.reset();
    this.isSaving.set(false);
    this.isCreatingVenue.set(false);
    this.isCreatingVenueSaving.set(false);
    this.isTypePreset.set(false);
  }

  isVenueRequired(): boolean {
    return this.isShowcaseType() === false;
  }

  ngOnInit(): void {
    this.#buildTypeOptions();
  }

  onClose(): void {
    if (this.isSaving() || this.isCreatingVenueSaving()) {
      return;
    }
    this.close();
  }

  onPlanIdChange(catalogPlanId: number | null): void {
    this.form.get('catalogPlanId')?.setValue(catalogPlanId);

    if (this.isOpen()) {
      this.form.get('catalogPlanId')?.markAsTouched();
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const partner = this.#partnerService.getPartner();

    if (!partner?.id) {
      this.#toastService.add({
        message: this.#translateService.instant('createEvent.partnerNotFound'),
        type: ToastType.ERROR,
      });
      return;
    }

    const formData: CreateEventFormData = {
      catalogPlanId: this.form.get('catalogPlanId')?.value ?? null,
      title: this.form.get('title')!.value,
      type: this.form.get('type')!.value,
      venueId: this.form.get('venueId')?.value ?? null,
    };

    let payload: CreateMainPlanPayload;

    if (formData.type === 'showcase') {
      if (formData.catalogPlanId === null) {
        return;
      }

      payload = {
        catalog_plan_id: formData.catalogPlanId,
        plan_type: 'showcase',
        title: formData.title,
        ...(this.canPickShowcaseVenue && formData.venueId !== null ? { place_id: formData.venueId } : {}),
      };
    } else {
      if (formData.venueId === null) {
        return;
      }

      payload = {
        place_id: formData.venueId,
        plan_type: formData.type,
        title: formData.title,
      };
    }

    this.isSaving.set(true);
    this.#createMainPlanService
      .createMainPlan(partner.id, payload)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.isSaving.set(false);
          this.#toastService.add({
            message: this.#translateService.instant('createEvent.error'),
            type: ToastType.ERROR,
          });
        },
        next: response => {
          if (!response.data || !response.data.plan_id) {
            this.#toastService.add({
              message: this.#translateService.instant('createEvent.error'),
              type: ToastType.ERROR,
            });
            this.isSaving.set(false);
            return;
          }

          const planId = response.data.plan_id;

          this.#fzTracking.track(createEvent({ eventType: formData.type, flow: 'advanced', planId }));
          this.isSaving.set(false);
          this.close({ trackClose: false });
          window.location.href = `/plans/dashboard?planId=${planId}`;
        },
      });
  }

  onTypeSelect(type: SelectOption | undefined): void {
    if (!type) {
      this.selectedTypeOption.set(undefined);
      this.form.get('type')?.setValue(null);
      this.#updateLocationValidators(null);
      return;
    }

    this.selectedTypeOption.set(type);
    this.form.get('type')?.setValue(type.id);
    this.#updateLocationValidators(String(type.id));
  }

  onVenueChange(venue: Venue | null): void {
    this.form.get('venueId')?.setValue(venue?.id ?? null);

    if (this.isOpen()) {
      this.form.get('venueId')?.markAsTouched();
    }
  }

  onVenueCreateCancel(): void {
    if (this.isCreatingVenueSaving()) {
      return;
    }

    this.isCreatingVenue.set(false);
  }

  onExistingVenueSelected(venue: Venue): void {
    this.isCreatingVenueSaving.set(false);
    this.isCreatingVenue.set(false);
    this.venueSelect()?.selectVenue(venue);
  }

  onVenueCreated(venue: Venue): void {
    this.onExistingVenueSelected(venue);
    this.#toastService.addSuccess(this.#translateService.instant('createEvent.newVenueCreated'));
  }

  onVenueCreateFailed(): void {
    this.#toastService.addError(this.#translateService.instant('venues.createModal.createError'));
  }

  onVenueCreateRequested(): void {
    this.isCreatingVenueSaving.set(false);
    this.isCreatingVenue.set(true);
  }

  open(): void {
    this.#fzTracking.track(clickOpenCreateEventModal());
    this.isOpen.set(true);
  }

  openWithType(type: CreateEventType): void {
    const option: SelectOption = {
      id: type,
      title: this.#createEventTypeService.getTypeLabel(type),
    };

    this.onTypeSelect(option);
    this.isTypePreset.set(true);
    this.open();
  }

  showVenueSelect(): boolean {
    return this.isShowcaseType() === false || this.canPickShowcaseVenue;
  }

  #buildTypeOptions(): void {
    const types: SelectOption[] = this.#createEventTypeService.getAvailableTypeConfigs().map(config => ({
      id: config.type,
      title: this.#translateService.instant(`createEvent.types.${config.type}`),
    }));

    this.typeOptions.set(types);
  }

  #resetFormState(): void {
    this.selectedTypeOption.set(undefined);
  }

  #updateLocationValidators(planType: string | null): void {
    const venueControl = this.form.get('venueId');
    const catalogPlanControl = this.form.get('catalogPlanId');

    if (planType === 'showcase') {
      venueControl?.clearValidators();
      if (this.canPickShowcaseVenue === false) {
        venueControl?.setValue(null);
        this.venueSelect()?.reset();
      }
      catalogPlanControl?.setValidators([Validators.required]);
    } else {
      catalogPlanControl?.clearValidators();
      catalogPlanControl?.setValue(null);
      this.planSelect()?.reset();
      venueControl?.setValidators([Validators.required]);
    }

    venueControl?.updateValueAndValidity({ emitEvent: false });
    catalogPlanControl?.updateValueAndValidity({ emitEvent: false });
  }
}
