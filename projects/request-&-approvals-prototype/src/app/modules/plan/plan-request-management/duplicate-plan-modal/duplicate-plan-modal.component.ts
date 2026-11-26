import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { SelectOptionTypeaheadInput } from '../../../../core/tracking/core/events/select-option-typeahead';
import { DropdownService } from '../../../../shared/dropdown/dropdown.service';
import { SelectDropdownCityOption } from '../../../../shared/dropdown/select-dropdown-city-option';
import { SelectDropdownPlanOption } from '../../../../shared/dropdown/select-dropdown-plan-option';
import { SelectOption } from '../../../../shared/layout/filters/select/select.interface';
import { TypeaheadEvent } from '../../../../shared/layout/filters/typeahead/typeahead-event.model';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { SearchBarFilter } from '../../../../shared/search-bar/enums/search-bar-filter.enum';
import { PlaceOption } from '../../../../shared/search-bar/models/place-option.model';
import { SearchBarService } from '../../../../shared/search-bar/service/search-bar.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { ListPlanItem } from '../../../attendees/list-attendees/models/list-plan-item.model';
import { DuplicatePlanOrchestratorService } from '../../services/duplicate-plan-orchestrator.service';
import { DuplicatePlanSuccess } from '../../services/duplicate-plan-result.model';
import { planTrackingProvider } from '../../tracking/plan.tracking-provider';

@Component({
  providers: [DuplicatePlanOrchestratorService, ...planTrackingProvider()],
  selector: 'app-duplicate-modal',
  standalone: false,
  styleUrls: ['./duplicate-plan-modal.component.scss'],
  templateUrl: './duplicate-plan-modal.component.html',
})
export class DuplicatePlanModalComponent implements OnInit {
  static readonly filtersDependencyOrder = [SearchBarFilter.city, SearchBarFilter.place, SearchBarFilter.plan];
  @Output() responseEmitter = new EventEmitter<boolean>();

  citiesDropdownOptions: Array<SelectDropdownCityOption> = [];
  planDropdownOptions: Array<SelectDropdownPlanOption> = [];
  placesDropdownOptions: Array<SelectOption> = [];
  selectedCity: SelectDropdownCityOption | undefined;
  selectedPlan: SelectDropdownPlanOption | undefined;
  typedCity: string | SelectOption | undefined;
  typedPlan: string | SelectOption | undefined;
  typedPlace: string | SelectOption | undefined;
  selectedPlace: SelectOption | undefined;
  typedSearchFilters: string[] = [];

  initialCityOption: SelectDropdownCityOption | string | undefined;
  initialPlanOption: SelectDropdownPlanOption | string | undefined;
  initialPlaceOption: SelectOption | string | undefined;
  selectOptionTypeaheadInput = SelectOptionTypeaheadInput;

  cleanCitySubject = new Subject<void>();
  cleanPlanSubject = new Subject<void>();
  cleanPlaceSubject = new Subject<void>();

  filtersEnum = SearchBarFilter;

  private destroy$ = new Subject<void>();

  private partner: Partner | null = null;
  private plans: Array<ListPlanItem> = [];
  private places: Array<PlaceOption> = [];
  disabled = false;
  mandatoryFilters = ['city', 'venue'];
  loading = false;

  readonly #duplicatePlanOrchestratorService = inject(DuplicatePlanOrchestratorService);

  constructor(
    private modal: NgbActiveModal,
    private dropdownService: DropdownService,
    private searchBarService: SearchBarService,
    private partnerService: PartnerService,
  ) {}

  ngOnInit(): void {
    this.partner = this.partnerService.getPartner();
    if (!this.partner) {
      return;
    }
    this.loadFilters();
  }

  private loadFilters(): void {
    if (!this.partner) {
      return;
    }
    this.searchBarService.getSearchBarOptions(this.partner.id).subscribe(response => {
      if (!response || !response.data) {
        return;
      }
      this.plans = response.data.plans as ListPlanItem[];
      this.places = response.data.places;
      this.citiesDropdownOptions = Object.assign([], response.data.cities);
      if (this.citiesDropdownOptions.length === 1) {
        this.selectedCity = this.citiesDropdownOptions[0];
      }
      this.updatePlanAndPlaceDropdown();
    });
  }

  private updatePlanAndPlaceDropdown(): void {
    if (this.areAllPreviousMandatoryFiltersFilled(SearchBarFilter.place, false)) {
      this.placesDropdownOptions = this.dropdownService.getPlaceDropdownOptions(this.places, this.selectedCity?.id);
      if (this.placesDropdownOptions.length === 1) {
        this.selectedPlace = this.placesDropdownOptions[0];
      }
    }
    this.updatePlansDropdown();
  }

  private updatePlacesDropdown(): void {
    if (!this.areAllPreviousMandatoryFiltersFilled(SearchBarFilter.place, false)) {
      return;
    }
    this.placesDropdownOptions = this.dropdownService.getPlaceDropdownOptions(this.places, this.selectedCity?.id);
    this.typedPlace = undefined;
    if (!this.selectedPlace && this.placesDropdownOptions.length === 1) {
      this.selectedPlace = this.placesDropdownOptions[0];
    }
  }

  private areAllThisFilterFilled(filters: SearchBarFilter[], checkTypedFilters = true): boolean {
    return filters.every(filter => this.isThisFilterFilled(filter, checkTypedFilters));
  }

  private isThisFilterFilled(filter: SearchBarFilter, checkTypedFilters: boolean): boolean {
    const typedFiltersToCheck = checkTypedFilters ? this.typedSearchFilters : [];
    switch (filter) {
      case SearchBarFilter.city:
        return Boolean(this.selectedCity || (typedFiltersToCheck.includes(SelectOptionTypeaheadInput.city) && this.typedCity));

      case SearchBarFilter.plan:
        return Boolean(this.selectedPlan || (typedFiltersToCheck.includes(SelectOptionTypeaheadInput.plan) && this.typedPlan));

      case SearchBarFilter.place:
        return Boolean(this.selectedPlace || (typedFiltersToCheck.includes(SelectOptionTypeaheadInput.venue) && this.typedPlace));

      default:
        return false;
    }
  }

  private getDependentFilters(
    filter: SearchBarFilter,
    dependencies = DuplicatePlanModalComponent.filtersDependencyOrder,
  ): SearchBarFilter[] {
    const filterIndex = dependencies.findIndex(testedFilter => testedFilter === filter);
    return dependencies.slice(0, Math.max(filterIndex, 0));
  }

  private areAllPreviousMandatoryFiltersFilled(filter: SearchBarFilter, checkTypedFilters = true): boolean {
    const previousMandatoryFilters = this.getDependentFilters(filter).filter(testedFilter => this.mandatoryFilters.includes(testedFilter));

    return this.areAllThisFilterFilled(previousMandatoryFilters, checkTypedFilters);
  }

  isFilterDisabled(filter: SearchBarFilter): boolean {
    return !this.areAllPreviousMandatoryFiltersFilled(filter);
  }

  duplicate(): void {
    if (!this.selectedPlan) {
      return;
    }
    this.loading = true;

    this.#duplicatePlanOrchestratorService
      .executeDuplicate({
        planId: this.selectedPlan.id,
        planName: this.selectedPlan.title,
        source: 'plan_request',
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      )
      .subscribe({
        next: (result: DuplicatePlanSuccess) => this.modal.close(result.planName),
        error: () => this.modal.close(null),
      });
  }

  selectCity(city: SelectDropdownCityOption): void {
    this.selectedPlan = undefined;
    this.typedPlan = undefined;
    this.cleanPlanSubject.next();
    this.selectedPlace = undefined;
    this.typedPlace = undefined;
    this.cleanPlaceSubject.next();
    this.placesDropdownOptions = [];
    this.selectedCity = city;
    this.typedCity = undefined;
    this.updatePlanAndPlaceDropdown();
  }

  selectPlan(plan: SelectDropdownPlanOption): void {
    this.selectedPlace = undefined;
    this.typedPlace = undefined;
    this.cleanPlaceSubject.next();
    this.selectedPlan = plan;
    this.typedPlan = undefined;
    this.updatePlacesDropdown();
  }

  selectPlace(venueOption: SelectOption): void {
    this.selectedPlace = venueOption;
    this.typedPlace = undefined;
    this.updatePlansDropdown();
  }

  checkSelectedCity(event: TypeaheadEvent): void {
    const cityOption: SelectOption | string = event.selectedOption || '';
    if (this.typedSearchFilters && this.typedSearchFilters.includes(SelectOptionTypeaheadInput.city) && typeof cityOption === 'string') {
      this.typedCity = cityOption;
      if (!cityOption) {
        this.cleanDependantFilters(SearchBarFilter.city);
      }
      return;
    }

    if (typeof cityOption !== 'string' && !cityOption?.['id']) {
      this.cleanDependantFilters(SearchBarFilter.city);
    }
  }

  checkSelectedPlan(event: TypeaheadEvent): void {
    const planOption = event.selectedOption || '';
    if (this.typedSearchFilters && this.typedSearchFilters.includes(SelectOptionTypeaheadInput.plan) && typeof planOption === 'string') {
      this.typedPlan = planOption;
      if (!planOption) {
        this.cleanDependantFilters(SearchBarFilter.plan);
      }
      return;
    }
    if (typeof planOption !== 'string' && !planOption?.['id']) {
      this.cleanDependantFilters(SearchBarFilter.plan);
    }
  }

  checkSelectedPlace(event: TypeaheadEvent): void {
    const placeOption = event.selectedOption || '';
    if (this.typedSearchFilters && this.typedSearchFilters.includes(SelectOptionTypeaheadInput.venue) && typeof placeOption === 'string') {
      this.typedPlace = placeOption;
      if (!placeOption) {
        this.cleanDependantFilters(SearchBarFilter.place);
      }
      return;
    }
    if (typeof placeOption !== 'string' && !placeOption?.['id']) {
      this.cleanDependantFilters(SearchBarFilter.place);
    }
  }

  private updatePlansDropdown(): void {
    if (!this.areAllPreviousMandatoryFiltersFilled(SearchBarFilter.plan)) {
      return;
    }
    this.planDropdownOptions = this.dropdownService.getPlanDropdownOptionsFilteredByVenue(
      this.plans,
      this.selectedCity?.id,
      this.selectedPlace?.id,
    );
    this.typedPlan = undefined;
    if (this.planDropdownOptions.length === 1) {
      this.selectedPlan = this.planDropdownOptions[0];
      return;
    }
    this.selectedPlan = undefined;
    if (this.areAllPreviousMandatoryFiltersFilled(SearchBarFilter.place)) {
      this.placesDropdownOptions = this.dropdownService.getPlaceDropdownOptions(this.places, this.selectedCity?.id);
    }
  }

  private cleanDependantFilters(filter: SearchBarFilter): void {
    this.cleanFilter(filter);
    this.getDependentFilters(filter, [...DuplicatePlanModalComponent.filtersDependencyOrder].reverse()).forEach(dependandFilter => {
      if (!this.areAllPreviousMandatoryFiltersFilled(dependandFilter)) {
        this.cleanFilter(dependandFilter, true);
      }
    });
  }

  private cleanFilter(filter: SearchBarFilter, cleanDropdown = false): void {
    switch (filter) {
      case SearchBarFilter.city:
        this.cleanCity(cleanDropdown);
        break;

      case SearchBarFilter.plan:
        this.cleanPlan(cleanDropdown);
        break;

      case SearchBarFilter.place:
        this.cleanPlace(cleanDropdown);
        break;

      default:
        return;
    }
  }

  private cleanCity(cleanDropdown: boolean) {
    this.cleanCitySubject.next();
    this.selectedCity = undefined;
    this.typedCity = undefined;
    if (cleanDropdown && !this.typedSearchFilters.includes(SelectOptionTypeaheadInput.city)) {
      this.citiesDropdownOptions = [];
    }
  }

  private cleanPlan(cleanDropdown: boolean) {
    this.cleanPlanSubject.next();
    this.selectedPlan = undefined;
    this.typedPlan = undefined;
    if (cleanDropdown && !this.typedSearchFilters.includes(SelectOptionTypeaheadInput.plan)) {
      this.planDropdownOptions = [];
    }
  }

  private cleanPlace(cleanDropdown: boolean) {
    this.cleanPlaceSubject.next();
    this.selectedPlace = undefined;
    this.typedPlace = undefined;
    if (cleanDropdown && !this.typedSearchFilters.includes(SelectOptionTypeaheadInput.venue)) {
      this.placesDropdownOptions = [];
    }
  }

  close(response: boolean): void {
    this.responseEmitter.emit(response);
    this.modal.close(false);
  }
}
