import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  OnInit,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { Place } from '@fz-original/app/shared/models/plan/place.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { OSSConfig, OSSPlanConfig, PlanSelectOption } from '../../models';
import { OSSConfigStorageService } from '../../services/oss-config-storage.service';
import { type OssPlanSelectionModalData, type OssPlanSelectionModalResult } from './oss-plan-selection-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-oss-plan-selection-modal',
  },
  imports: [IgntDialogModule, IgntIconComponent, IgntInputFieldComponent, NgTemplateOutlet, ReactiveFormsModule, TranslateModule],
  selector: 'app-oss-plan-selection-modal',
  standalone: true,
  styleUrls: ['./oss-plan-selection-modal.component.scss'],
  templateUrl: './oss-plan-selection-modal.component.html',
})
export class OssPlanSelectionModalComponent implements OnInit {
  static readonly citySearchThreshold = 6;
  static readonly planSearchThreshold = 8;
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogData = inject<OssPlanSelectionModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<OssPlanSelectionModalResult>>(IGNT_DIALOG_REF);
  readonly #formBuilder = inject(FormBuilder);
  readonly #injector = inject(Injector);
  readonly #ossConfigStorageService = inject(OSSConfigStorageService);
  #plansByCityIdMap = new Map<number, Plan[]>();
  #plansSignal: WritableSignal<Plan[]> = signal<Plan[]>([]);
  #selectedPlanOption: WritableSignal<PlanSelectOption | null> = signal<PlanSelectOption | null>(null);
  #disabledPlanIdsSignal: WritableSignal<Set<number>> = signal<Set<number>>(new Set<number>());

  get selectedCity(): SelectOption | null {
    const cityId = this.form.get('cityId')?.value;
    return this.cityOptions().find(city => city.id === cityId) || null;
  }

  protected get selectedPlan(): PlanSelectOption | null {
    const internalSelection = this.#selectedPlanOption();
    if (internalSelection) {
      return internalSelection;
    }
    const { id: planId, placeId } = this.currentPlanConfigSignal() || {};
    return this.planOptions().find(plan => plan.planId === Number(planId) && plan.placeId === Number(placeId)) || null;
  }

  protected allPlanOptions: PlanSelectOption[] = [];
  protected cityOptions: WritableSignal<SelectOption[]> = signal<SelectOption[]>([]);
  protected citySearchFormControl = new FormControl('');
  protected citySearchTerm: WritableSignal<string> = signal('');
  @ViewChild('citySearchInput') citySearchInput?: IgntInputFieldComponent;
  protected currentPlanConfigSignal = signal<OSSPlanConfig | null>(null);
  protected filteredCityOptions: Signal<SelectOption[]> = computed(() => {
    const cities = this.cityOptions();
    if (!this.shouldShowCitySearch()) {
      return cities;
    }

    const searchTerm = this.citySearchTerm().toLowerCase().trim();
    if (searchTerm === '') {
      return cities;
    }

    return cities.filter(city => city.title.toLowerCase().includes(searchTerm));
  });
  protected filteredPlanOptions: Signal<PlanSelectOption[]> = computed(() => {
    const plans = this.planOptions();
    if (!this.shouldShowPlanSearch()) {
      return plans;
    }

    const searchTerm = this.planSearchTerm().toLowerCase().trim();
    if (searchTerm === '') {
      return plans;
    }

    return plans.filter(plan => {
      return plan.title.toLowerCase().includes(searchTerm) || plan.place?.toLowerCase().includes(searchTerm);
    });
  });
  form: FormGroup = this.#formBuilder.group({});
  protected hasCloseButton: Signal<boolean> = computed(() => this.#dialogData.hasCloseButton);
  protected isLoadingPlans: WritableSignal<boolean> = signal<boolean>(false);
  protected isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  protected isTablet: Signal<boolean> = this.#breakpointStateService.getStateProp('isTablet');
  planOptions: WritableSignal<PlanSelectOption[]> = signal<PlanSelectOption[]>([]);
  protected planSearchFormControl = new FormControl('');
  planSearchTerm: WritableSignal<string> = signal('');
  @ViewChild('planSearchInput') planSearchInput?: IgntInputFieldComponent;
  @ViewChild('planSection') planSection?: ElementRef<HTMLDivElement>;
  protected selectedCitySignal: WritableSignal<SelectOption | null> = signal<SelectOption | null>(null);
  protected shouldShowCitySearch: Signal<boolean> = computed(
    () => this.cityOptions().length > OssPlanSelectionModalComponent.citySearchThreshold,
  );
  protected shouldShowCitySelector: Signal<boolean> = computed(() => {
    const cityOptions = this.cityOptions();
    return this.allPlanOptions.length > 10 && cityOptions.length > 1;
  });
  protected shouldShowPlanSearch: Signal<boolean> = computed(
    () => this.planOptions().length > OssPlanSelectionModalComponent.planSearchThreshold,
  );
  protected shouldShowPlanSection: Signal<boolean> = computed(() => {
    if (!this.shouldShowCitySearch()) {
      return true;
    }
    const searchTerm = this.citySearchTerm().toLowerCase().trim();
    if (searchTerm === '') {
      return true;
    }
    const selectedCityId = this.selectedCitySignal()?.id;
    if (!selectedCityId) {
      return false;
    }
    return this.filteredCityOptions().some(city => city.id === selectedCityId);
  });

  constructor() {
    this.citySearchFormControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => {
      const searchTerm = value ?? '';
      this.citySearchTerm.set(searchTerm);
      if (searchTerm.trim() !== '') {
        this.form.get('planId')?.reset();
        this.form.get('placeId')?.reset();
      }
    });

    this.planSearchFormControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => {
      const searchTerm = value ?? '';
      this.planSearchTerm.set(searchTerm);
    });
  }

  accept(): void {
    const formValue = this.form.value;
    const config: OSSPlanConfig = {
      id: formValue.planId,
      cityId: formValue.cityId,
      placeId: formValue.placeId,
    };
    this.#setPlanConfiguration(config);
    this.#dialogRef.close(config);
  }

  ngOnInit(): void {
    this.#plansSignal.set(this.#dialogData.plans || []);
    this.currentPlanConfigSignal.set(this.#dialogData.currentPlanConfig);
    const disabledPlanIds = this.#dialogData.disabledPlanIds;
    this.#disabledPlanIdsSignal.set(
      disabledPlanIds == null
        ? new Set<number>()
        : disabledPlanIds instanceof Set
          ? new Set<number>(disabledPlanIds)
          : new Set<number>(disabledPlanIds),
    );
    this.#selectedPlanOption.set(null);
    this.#initForm();
    this.#initPlansOptionsEffect();
    this.#focusSearchInput();
  }

  onCitySearchEnterKey(): void {
    if (this.filteredCityOptions().length > 0) {
      this.selectCity(this.filteredCityOptions()[0]);
      return;
    }
  }

  onPlanSearchEnterKey(): void {
    const firstEnabledPlan = this.filteredPlanOptions().find(plan => !this.isPlanInteractionDisabled(plan));
    if (firstEnabledPlan != null) {
      this.selectPlan(firstEnabledPlan);
      return;
    }
  }

  selectCity(city: SelectOption): void {
    if (!city?.id) {
      return;
    }

    if (this.form.get('cityId')?.value === city.id) {
      return;
    }

    this.form.patchValue({ cityId: city.id });
    this.selectedCitySignal.set(city);
    this.form.get('planId')?.reset();
    this.form.get('placeId')?.reset();
    this.#loadPlansOptionsForCity(city.id);
    this.#scrollToPlanSection();
  }

  updateCitySearch(searchTerm: string): void {
    this.citySearchFormControl.setValue(searchTerm);
  }

  updatePlanSearch(searchTerm: string): void {
    this.planSearchFormControl.setValue(searchTerm);
  }

  selectPlan(plan: PlanSelectOption): void {
    if (this.isPlanInteractionDisabled(plan)) {
      return;
    }
    this.#selectedPlanOption.set(plan);
    this.form.patchValue({
      planId: plan.planId,
      placeId: plan.placeId,
      cityId: plan.cityId,
    });

    this.accept();
  }

  isPlanDisabled(plan: PlanSelectOption): boolean {
    return this.#disabledPlanIdsSignal().has(plan.planId);
  }

  isPlanInteractionDisabled(plan: PlanSelectOption): boolean {
    return this.selectedCitySignal() == null || this.isPlanDisabled(plan);
  }

  #focusSearchInput(): void {
    if (this.shouldShowCitySearch()) {
      requestAnimationFrame(() => {
        this.citySearchInput?.inputElement?.nativeElement?.focus();
      });
      return;
    }

    if (this.shouldShowPlanSearch()) {
      requestAnimationFrame(() => {
        this.planSearchInput?.inputElement?.nativeElement?.focus();
      });
    }
  }

  #initForm(): void {
    this.form = this.#formBuilder.group({
      cityId: ['', Validators.required],
      planId: ['', Validators.required],
      placeId: ['', Validators.required],
    });
  }

  #initPlansOptionsEffect() {
    effect(
      () => {
        if (this.#plansSignal() && this.#plansSignal().length) {
          const cityMap = new Map<number, string>();
          this.#plansByCityIdMap.clear();
          this.allPlanOptions = [];

          this.#plansSignal().forEach(plan => {
            plan.places?.forEach(place => {
              if (place.city) {
                cityMap.set(place.city.id, place.city.name);

                const plansForCity = this.#plansByCityIdMap.get(place.city.id) || [];
                plansForCity.push(plan);

                this.#plansByCityIdMap.set(place.city.id, plansForCity);
                this.allPlanOptions.push(this.#mapPlanToSelectOption(plan, place));
              }
            });
          });

          const citiesArray = Array.from(cityMap.entries()).map(([id, name]) => ({
            id,
            title: name,
          }));
          this.cityOptions.set(citiesArray);

          if (this.shouldShowCitySelector()) {
            this.selectCity(citiesArray[0]);
          } else {
            this.planOptions.set(this.allPlanOptions);
            this.form.patchValue({ cityId: citiesArray[0].id });
            this.selectedCitySignal.set(citiesArray[0]);
          }
        }
      },
      { injector: this.#injector },
    );
  }

  #loadPlansOptionsForCity(cityId: number): void {
    const plansForCity = this.#plansByCityIdMap.get(cityId) || [];

    const planOptionsArray: PlanSelectOption[] = plansForCity.flatMap(
      plan => plan.places?.filter(place => place.city?.id === cityId).map(place => this.#mapPlanToSelectOption(plan, place)) || [],
    );

    this.planOptions.set(planOptionsArray);
  }

  #mapPlanToSelectOption(plan: Plan, place: Place): PlanSelectOption {
    return {
      id: `${plan.id}::${place.id}`,
      planId: plan.id ?? 0,
      placeId: place.id,
      cityId: place.city?.id ?? 0,
      title: plan.name || '',
      image: plan.pictureURL || '',
      place: place.name,
    };
  }

  #scrollToPlanSection(): void {
    if ((!this.isMobile() && !this.isTablet()) || !this.planSection?.nativeElement) {
      return;
    }

    setTimeout(() => {
      this.planSection?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 100);
  }

  #setPlanConfiguration(planConfig: OSSPlanConfig): void {
    const currentConfig = this.#ossConfigStorageService.getConfiguration();
    if (!currentConfig) {
      return;
    }

    const updatedConfig: OSSConfig = {
      ...currentConfig,
      plan: planConfig,
    };
    this.#ossConfigStorageService.setConfiguration(updatedConfig);
  }
}
