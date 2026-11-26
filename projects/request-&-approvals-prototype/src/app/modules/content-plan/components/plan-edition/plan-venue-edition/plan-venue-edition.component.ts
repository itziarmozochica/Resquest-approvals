import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { LoadPlanVenueEditEvent } from '@fz-original/app/core/tracking/core/events/load-plan-venue-edit';
import { SavePlanVenueEditEvent } from '@fz-original/app/core/tracking/core/events/save-plan-venue-edit';
import { ScreenTypeaheadInput, SelectOptionTypeaheadInput } from '@fz-original/app/core/tracking/core/events/select-option-typeahead';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { MessageModalComponent } from '@fz-original/app/shared/components/message-modal/message-modal.component';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { TypeaheadComponent } from '@fz-original/app/shared/layout/filters/typeahead/typeahead.component';
import { TypeaheadModule } from '@fz-original/app/shared/layout/filters/typeahead/typeahead.module';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { PlanDetail, Venue } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { PlanKind } from '@fz-original/app/shared/models/plan/plan-kind.enum';
import { WithUnsavedChangesGuardComponent } from '@fz-original/app/shared/models/with-unsaved-changes-guard-component.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { SearchBarService } from '@fz-original/app/shared/search-bar/service/search-bar.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { SelectedPlanContextService } from '@fz-original/app/shared/services/selected-plan-context/selected-plan-context.service';
import { IgntAlertComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, filter, finalize, map, merge, mergeMap, Observable, of, switchMap, take } from 'rxjs';

import { EditingPlanService } from '../../../services/editing-plan/editing-plan.service';
import { GooglePlacesService } from '../../../services/google-places/google-places.service';
import { VenueService } from '../../../services/venue/venue.service';
import { EditionConfirmationModalComponent } from '../edition-confirmation-modal/edition-confirmation-modal.component';

enum ComponentStateEnum {
  loading,
  error,
  ok,
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IgntAlertComponent,
    IgntIconComponent,
    ReactiveFormsModule,
    SharedComponentsModule,
    TranslateModule,
    TypeaheadModule,
  ],
  selector: 'app-plan-venue-edition',
  standalone: true,
  styleUrls: ['./plan-venue-edition.component.scss'],
  templateUrl: './plan-venue-edition.component.html',
})
export class PlanVenueEditionComponent implements OnInit, WithUnsavedChangesGuardComponent {
  #destroyRef = inject(DestroyRef);
  @Input() isDraftMode = false;
  @Input() isLastTab = false;
  @Output() saved = new EventEmitter<void>();
  @Output() saveFailed = new EventEmitter<void>();

  componentState = ComponentStateEnum.ok;
  componentStateEnum = ComponentStateEnum;
  isEditableVenue = false;
  isShowcasePlan = false;
  isShowcaseVenueEditable = false;
  isShowingVenueEditor = false;
  mapImageUrl: string | null = null;
  originalVenue: Venue | null = null;
  partner: Partner | null = null;
  planId: number | null = null;
  @ViewChild('savingModal', { static: true }) savingModal!: TemplateRef<unknown>;
  screenTypeaheadInput = ScreenTypeaheadInput;
  selectedVenue!: FormGroup<{
    address: FormControl<string | null>;
    city: FormControl<string | null>;
    id: FormControl<number | null>;
    latitude: FormControl<number | null>;
    longitude: FormControl<number | null>;
    name: FormControl<string | null>;
    secretVenue: FormControl<boolean | null>;
    timezone: FormControl<string | null>;
  }>;
  selectOptionTypeaheadInput = SelectOptionTypeaheadInput;
  showSuccessMessage = false;
  venueOptions: Array<{ id: string; title: string }> = [];
  venues: Venue[] = [];
  @ViewChild('venueTypeahead', { static: false }) venueTypeahead!: TypeaheadComponent;

  constructor(
    private editingPlan: EditingPlanService,
    private optimizelyService: OptimizelyService,
    private venueService: VenueService,
    private googlePlacesService: GooglePlacesService,
    private cdr: ChangeDetectorRef,
    private partnerService: PartnerService,
    private modalService: NgbModal,
    private translate: TranslateService,
    private trackingService: TrackingService,
    private selectedPlanContextService: SelectedPlanContextService,
    private planService: PlanService,
    private searchBarService: SearchBarService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.partner = this.partnerService.getPartner();
    this.initForm();
    this.isShowingVenueEditor = this.optimizelyService.isFeatureEnabled('plan_edition_venue') || false;
    this.isEditableVenue = this.optimizelyService.isFeatureEnabled('plan_edition_venue_edit') || false;
    this.isShowcaseVenueEditable = this.optimizelyService.isFeatureEnabled('showcase_plan_venue') || false;
    this.setupPlanDetailsSubscription();
  }

  #venueOf(planDetail: PlanDetail | null | undefined): Venue | null {
    if (this.isShowcasePlan && planDetail?.showcaseVenue) {
      return planDetail.showcaseVenue;
    }
    return planDetail?.venues?.[0] ?? null;
  }

  areChangesUnsaved(): boolean {
    return this.selectedVenue?.dirty ?? false;
  }

  canEditPlan(): boolean {
    return this.editingPlan.canEditPlan();
  }

  canPublish(): boolean {
    return this.canEditVenue() && this.hasVenueChanged() && this.isFormValid() && this.isEditableVenue;
  }

  canEditVenue(): boolean {
    return !this.isShowcasePlan || this.isShowcaseVenueEditable;
  }

  hasVenueChanged(): boolean {
    if (!this.originalVenue || !this.selectedVenue) {
      return false;
    }
    return (this.originalVenue.id ?? null) !== (this.selectedVenue.value.id ?? null);
  }

  isFormValid(): boolean {
    return (this.selectedVenue?.valid && this.originalVenue?.id !== this.selectedVenue.value.id) ?? false;
  }

  ngOnInit() {
    this.updateVenueOptions();
  }

  onVenueSearch(searchTerm: string): void {
    this.searchVenues(searchTerm || '');
  }

  async onVenueSelected(venueOption: { id: string; title: string }): Promise<void> {
    if (venueOption) {
      const venue = this.venues.find(v => v.id?.toString() === venueOption.id);
      if (venue) {
        await this.updateFormWithVenue(venue);
      }
    } else {
      this.clearVenueForm();
    }
  }

  onVenueUserInteraction(event: string): void {
    this.onVenueSearch(event);
  }

  publish(): void {
    if (!this.canEditPlan() || !this.canPublish()) {
      this.saveFailed.emit();
      return;
    }

    const venueData = this.selectedVenue.value;
    const venue: Venue = {
      address: venueData.address || '',
      cityName: venueData.city || '',
      id: venueData.id ?? -1,
      isSecret: venueData.secretVenue || false,
      latitude: venueData.latitude || -1,
      longitude: venueData.longitude || -1,
      name: venueData.name || '',
      timezone: venueData.timezone || 'UTC',
    };

    const save$ = this.isDraftMode
      ? this.updatePlanVenue(venue)
      : this.askForUserConfirmation().pipe(mergeMap(() => this.updatePlanVenue(venue)));

    save$
      .pipe(
        catchError(() => {
          this.displayMessageModal('common.errorTitle', [
            'planEdition.contentEdition.savingChangesError',
            'planEdition.contentEdition.savingChangesErrorContact',
          ]);
          this.saveFailed.emit();
          return EMPTY;
        }),
      )
      .subscribe(() => {
        this.originalVenue = { ...this.originalVenue, ...venue };
        this.refreshPlanDetailsAfterVenueUpdate();
        this.selectedVenue?.markAsPristine();
        this.showSuccessMessage = true;
        this.saved.emit();
      });
  }

  private askForUserConfirmation(): Observable<unknown> {
    const modal = this.modalService.open(EditionConfirmationModalComponent, { backdrop: 'static' });
    const component = modal.componentInstance as EditionConfirmationModalComponent;
    return component.response.pipe(
      take(1),
      finalize(() => modal.close()),
      filter(response => response),
      takeUntilDestroyed(this.#destroyRef),
    );
  }

  private clearVenueForm(): void {
    this.mapImageUrl = null;
    this.selectedVenue.patchValue({
      address: '',
      city: '',
      id: null,
      latitude: null,
      longitude: null,
      name: '',
      timezone: 'UTC',
    });
  }

  private displayLoadingModal(): NgbModalRef {
    return this.modalService.open(this.savingModal, { backdrop: 'static' });
  }

  private displayMessageModal(titleKey: string, messageKeys: Array<string>): NgbModalRef {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant(titleKey);
    modal.componentInstance.messages = messageKeys.map(key => this.translate.instant(key));
    return modal;
  }

  private getVenues(searchTerm: string): Observable<Venue[]> {
    const currency = this.originalVenue?.currency || 'EUR';
    const cityId = this.isDraftMode ? undefined : this.selectedPlanContextService.currentContext.cityId;
    return this.venueService.getVenues(this.partner!.id, currency, 1, 20, searchTerm || '', false, cityId, this.isDraftMode);
  }

  private initForm(): void {
    this.selectedVenue = new FormGroup({
      address: new FormControl<string>(''),
      city: new FormControl<string>(''),
      id: new FormControl<number | null>(null, [Validators.required]),
      latitude: new FormControl<number | null>(null),
      longitude: new FormControl<number | null>(null),
      name: new FormControl<string>('', [Validators.required]),
      secretVenue: new FormControl<boolean>(false),
      timezone: new FormControl<string | null>('UTC'),
    });

    this.selectedVenue.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.setVenueChange();
    });
  }

  private refreshPlanDetailsAfterVenueUpdate(): void {
    if (!this.planId) {
      return;
    }
    this.editingPlan.triggerSelectedPlanChanged();
  }

  private requestPlanDetailAndVenues(): Observable<{ planDetail: PlanDetail | null; venues: Venue[] }> {
    return this.editingPlan.getSelectedPlanDetail$().pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data;
      }),
      mergeMap(planDetail => {
        this.isShowcasePlan = planDetail?.type === PlanKind.SHOWCASE;
        this.originalVenue = this.#venueOf(planDetail);
        const searchTerm = this.originalVenue?.name ?? '';
        this.componentState = ComponentStateEnum.ok;
        return this.getVenues(searchTerm).pipe(
          map(venues => ({
            planDetail,
            venues,
          })),
        );
      }),
      catchError(() => {
        this.componentState = ComponentStateEnum.error;
        return of({ planDetail: null, venues: [] });
      }),
    );
  }

  private searchVenues(searchTerm: string): void {
    this.getVenues(searchTerm).subscribe({
      next: async (venues: Venue[]) => {
        this.venues = venues;
        this.updateVenueOptions();
        this.cdr.detectChanges();
      },
    });
  }

  private sendMixpanelLoadPlanVenueEditEvent(): void {
    this.trackingService.track(
      new LoadPlanVenueEditEvent({
        partner_id: this.partner!.id,
        plan_id: this.editingPlan.getSelectedPlanOption()!.id,
        plan_name: this.editingPlan.getSelectedPlanOption()!.title,
      }),
    );
  }

  private sendMixpanelSavePlanVenueEditEvent(): void {
    this.trackingService.track(
      new SavePlanVenueEditEvent({
        partner_id: this.partner!.id,
        plan_id: this.editingPlan.getSelectedPlanOption()!.id,
        plan_name: this.editingPlan.getSelectedPlanOption()!.title,
        venue_id: this.selectedVenue.value.id!,
        venue_name: this.selectedVenue.value.name!,
      }),
    );
  }

  private setupPlanDetailsSubscription(): void {
    merge(this.editingPlan.getSelectedPlanOption$(), this.editingPlan.getSelectedPlanChanged$())
      .pipe(
        switchMap(option => {
          this.planId = option?.id;

          if (!this.planId) {
            this.isShowcasePlan = false;
            return of(null);
          }
          this.isShowcasePlan = false;
          return this.requestPlanDetailAndVenues();
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(planDetailAndVenues => {
        if (!planDetailAndVenues) {
          return;
        }
        this.sendMixpanelLoadPlanVenueEditEvent();
        const { venues } = planDetailAndVenues;
        this.updateFormWithPlanData();

        if (this.originalVenue) {
          const foundVenue = venues.find((venue: Venue) => venue.id === this.originalVenue?.id);
          if (foundVenue) {
            const mergedVenue: Venue = {
              ...foundVenue,
              address: foundVenue.address || this.originalVenue.address || '',
              cityName: foundVenue.cityName || this.originalVenue.cityName || '',
            };
            this.updateFormWithVenue(mergedVenue);
          }
        }
        this.cdr.detectChanges();
      });
  }

  private setVenueChange(): void {
    const formId = this.selectedVenue.value.id ?? null;
    const originalId = this.originalVenue?.id ?? null;
    if (formId === originalId) {
      this.selectedVenue.markAsPristine();
      return;
    }
    this.selectedVenue.markAsDirty();
  }

  private updateFormWithPlanData(): void {
    const currentVenueData = this.originalVenue;
    this.selectedVenue.patchValue({
      address: currentVenueData?.address || '',
      city: currentVenueData?.cityName || '',
      id: currentVenueData?.id ?? null,
      latitude: currentVenueData?.latitude || null,
      longitude: currentVenueData?.longitude || null,
      name: currentVenueData?.name || '',
      secretVenue: false,
      timezone: currentVenueData?.timezone || 'UTC',
    });
  }

  private async updateFormWithVenue(venue: Venue): Promise<void> {
    if (venue.latitude && venue.longitude) {
      try {
        this.mapImageUrl = await this.googlePlacesService.getMapImageUrl(venue.latitude, venue.longitude);
      } catch (error) {
        console.warn('Failed to generate map image for venue coordinates:', error);
      }
    } else {
      this.mapImageUrl = null;
    }

    this.selectedVenue.patchValue({
      address: venue.address || '',
      city: venue.cityName || '',
      id: venue.id,
      latitude: venue.latitude || null,
      longitude: venue.longitude || null,
      name: venue.name,
      timezone: venue.timezone || 'UTC',
    });
    this.cdr.detectChanges();
  }

  private updatePlanVenue(venue: Venue): Observable<PlanDetail | unknown> {
    const modal = this.displayLoadingModal();

    return this.venueService.updateVenue(this.partner!.id, this.planId!, [venue]).pipe(
      map((response: any) => {
        const place = Array.isArray(response) ? response[0] : response;
        const cityId = place?.city?.id ?? 1;
        this.planService.clearPlansCache();
        this.planService.getPlans(this.partner!.id).subscribe(() => {
          const scopedVenueId = this.isShowcasePlan ? undefined : venue.id;
          this.selectedPlanContextService.updatePlanContext(this.planId!, cityId, undefined, scopedVenueId);
          this.searchBarService.clearPlanList();
          this.searchBarService.getSearchBarOptionsUpdated(this.partner!.id).subscribe(() => {});

          if (scopedVenueId) {
            this.updateUrlParams(cityId, scopedVenueId);
          }
        });

        return response;
      }),
      finalize(() => {
        this.sendMixpanelSavePlanVenueEditEvent();
        modal.close();
        this.cdr.detectChanges();
      }),
    );
  }

  private updateUrlParams(cityId: number, venueId?: number): void {
    const queryParams = {
      cityId: cityId.toString(),
      planId: this.planId?.toString(),
      venueId: venueId?.toString(),
    };

    this.router.navigate([], {
      queryParams: queryParams,
      queryParamsHandling: 'merge',
      relativeTo: this.route,
    });
  }

  private updateVenueOptions(showDropdown: boolean = true): void {
    const newOptions = this.venues.map(venue => ({
      id: venue.id!.toString(),
      title: venue.name,
    }));
    this.venueOptions = newOptions;
    this.cdr.detectChanges();
    if (this.venueTypeahead && showDropdown) {
      this.venueTypeahead.showAllSubject.next();
    }
  }
}
