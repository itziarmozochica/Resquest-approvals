import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
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
  untracked,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { EMPTY_ONSITE_SETUPS_SUMMARY } from '@fz-original/app/modules/box-office/shared/models/onsite-setups-summary.model';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { OnsiteSetupsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups.service';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { PlaceOption } from '@fz-original/app/shared/search-bar/models/place-option.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, IgntPillButtonComponent, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { OSSConfig } from '../../models';
import { OSSConfigStorageService } from '../../services/oss-config-storage.service';
import { RecentOnsiteSetup, RecentOnsiteSetupsService } from '../../services/recent-onsite-setups.service';
import { OssOnsiteSetupStore } from '../../store/oss-onsite-setup.store';
import { TrackPosConfigSetupChangedService } from '../../tracking/services/track-pos-config-setup-changed.service';
import { getPreviousSetupIdFromConfig } from '../../tracking/utils/pos-config-setup-changed.util';
import { findPlaceSummary, getOnsiteSetupsFromSummary } from '../../utils/onsite-setups-summary.util';
import { type OssOnsiteSetupModalData, type OssOnsiteSetupModalResult, type RecentOnsiteSetupOption } from './oss-onsite-setup-modal.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'oss-onsite-setup-modal',
  },
  imports: [
    FormsModule,
    IgntButtonComponent,
    IgntDialogModule,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntPillButtonComponent,
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-oss-onsite-setup-modal',
  standalone: true,
  styleUrls: ['./oss-onsite-setup-modal.component.scss'],
  templateUrl: './oss-onsite-setup-modal.component.html',
})
export class OssOnsiteSetupModalComponent implements OnInit {
  static readonly venueSearchThreshold = 8;
  readonly #breakpointStateService = inject(BreakpointStateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogData = inject<OssOnsiteSetupModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<OssOnsiteSetupModalResult>>(IGNT_DIALOG_REF);
  readonly #formBuilder = inject(FormBuilder);
  readonly #injector = inject(Injector);
  readonly #onsiteSetupStore = inject(OssOnsiteSetupStore);
  readonly #onsiteSetupsService = inject(OnsiteSetupsService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #ossConfigStorageService = inject(OSSConfigStorageService);
  readonly #partnerService = inject(PartnerService);
  readonly #recentOnsiteSetupsService = inject(RecentOnsiteSetupsService);
  readonly #trackPosConfigSetupChangedService = inject(TrackPosConfigSetupChangedService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);
  #initialVenueSelectionApplied = false;
  #isAccepting = false;
  #preselectedOnsiteSetupId?: string;
  #preselectedVenueId?: string;
  #storedRecentOnsiteSetups: WritableSignal<RecentOnsiteSetup[]> = signal<RecentOnsiteSetup[]>([]);

  protected placeOptions: Signal<PlaceOption[]> = this.#onsiteSetupStore.placeOptions;
  protected venueSearchTerm: WritableSignal<string> = signal('');
  protected filteredPlaceOptions: Signal<PlaceOption[]> = computed(() => {
    const places = this.placeOptions();
    if (!this.isVenueSearchVisible()) {
      return places;
    }

    const searchTerm = this.venueSearchTerm().toLowerCase().trim();
    if (searchTerm === '') {
      return places;
    }

    return places.filter(place => place.name.toLowerCase().includes(searchTerm));
  });
  protected form!: FormGroup;
  protected hasActiveShiftAndPreviousOnsiteSetup: WritableSignal<boolean> = signal(false);
  protected hasCloseButton: Signal<boolean> = computed(() => this.#dialogData.hasCloseButton);
  protected isLoadingPlaces: Signal<boolean> = computed(
    () => this.#onsiteSetupStore.isLoading() && this.#onsiteSetupStore.onsiteSetupsSummary() === null,
  );
  protected isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  protected isTablet: Signal<boolean> = this.#breakpointStateService.getStateProp('isTablet');
  protected isVenueSearchActive: WritableSignal<boolean> = signal(false);
  protected recentOnsiteSetups: Signal<RecentOnsiteSetupOption[]> = computed(() => {
    const setupsById = this.#onsiteSetupStore.onsiteSetupsSummary()?.onsite_setups_by_id ?? {};
    return this.#storedRecentOnsiteSetups()
      .map(recent => ({ id: recent.id, name: setupsById[recent.id]?.onsite_setup_name ?? '' }))
      .filter(option => option.name !== '');
  });
  protected isRecentSectionVisible: Signal<boolean> = computed(() => this.recentOnsiteSetups().length > 0 && !this.isVenueSearchActive());
  protected isVenueSearchVisible: Signal<boolean> = computed(
    () => this.placeOptions().length > OssOnsiteSetupModalComponent.venueSearchThreshold,
  );
  protected isVenueSearchFieldVisible: Signal<boolean> = computed(
    () => this.isVenueSearchActive() || (this.isVenueSearchVisible() && this.recentOnsiteSetups().length === 0),
  );
  protected selectedOnsiteSetupOption: WritableSignal<SelectOption | null> = signal<SelectOption | null>(null);
  protected modalTitle: Signal<string> = computed(() => {
    const baseTitle = this.#translateService.instant('oneStopShop.onsiteSetupModal.title');
    const selectedSetup = this.selectedOnsiteSetupOption();
    if (selectedSetup?.title) {
      return `${baseTitle} - ${selectedSetup.title}`;
    }
    return baseTitle;
  });
  protected onsiteSetupOptions: WritableSignal<SelectOption[]> = signal<SelectOption[]>([]);
  @ViewChild('onsiteSetupSection') onsiteSetupSection?: ElementRef<HTMLDivElement>;
  protected pendingRecentSetupSelection: WritableSignal<string | null> = signal<string | null>(null);
  @ViewChild('venueSearchInput') venueSearchInput?: IgntInputFieldComponent;
  protected selectedPlace: WritableSignal<PlaceOption | null> = signal<PlaceOption | null>(null);
  protected shouldShowSetups: Signal<boolean> = computed(() => {
    if (!this.isVenueSearchVisible()) {
      return true;
    }
    const searchTerm = this.venueSearchTerm().toLowerCase().trim();
    if (searchTerm === '') {
      return true;
    }
    const selectedPlaceId = this.selectedPlace()?.id;
    if (!selectedPlaceId) {
      return false;
    }
    return this.filteredPlaceOptions().some(place => place.id === selectedPlaceId);
  });
  protected userName: string | null = null;
  protected venueSearchFormControl = new FormControl('');

  constructor() {
    effect(
      () => {
        const summary = this.#onsiteSetupStore.onsiteSetupsSummary();
        if (!summary || this.#initialVenueSelectionApplied) {
          return;
        }
        this.#initialVenueSelectionApplied = true;
        untracked(() => {
          this.#loadRecentOnsiteSetups();
          this.#applyInitialVenueSelection();
        });
      },
      { injector: this.#injector },
    );

    this.venueSearchFormControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => {
      const searchTerm = value ?? '';
      this.venueSearchTerm.set(searchTerm);
      if (searchTerm.trim() !== '') {
        this.form.get('onsiteSetupId')?.reset();
        this.selectedOnsiteSetupOption.set(null);
      }
    });
  }

  accept(): void {
    if (this.hasActiveShiftAndPreviousOnsiteSetup()) {
      this.#dialogRef.close(undefined);
      return;
    }

    if (this.#isAccepting) {
      return;
    }

    this.#isAccepting = true;

    const formValue = this.form.value;
    const summary = this.#onsiteSetupStore.onsiteSetupsSummary() ?? EMPTY_ONSITE_SETUPS_SUMMARY;
    const placeSummary = findPlaceSummary(summary, formValue.placeId);
    const selectedSetup = this.selectedOnsiteSetupOption();
    if (selectedSetup) {
      this.#rememberOnsiteSetup(String(selectedSetup.id));
    }
    const fromSetupId = getPreviousSetupIdFromConfig(this.#ossConfigStorageService.getConfiguration());
    const toSetupId = String(formValue.onsiteSetupId);
    const ossOnsiteSetup: OSSConfig = {
      onsiteSetup: {
        cityId: formValue.cityId,
        id: formValue.onsiteSetupId,
        placeCountryCode: placeSummary?.country_iso_code_2,
        placeId: formValue.placeId,
        placeName: formValue.placeName,
      },
    };

    if (fromSetupId !== toSetupId) {
      this.#trackPosConfigSetupChangedService.trackSetupChanged(fromSetupId, toSetupId);
    }
    this.#ossConfigStorageService.setConfiguration(ossOnsiteSetup);

    this.#onsiteSetupsService
      .getOnsiteSetupByPlace(formValue.placeId, formValue.onsiteSetupId)
      .pipe(
        finalize(() => {
          this.#isAccepting = false;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => {
          this.#dialogRef.close(ossOnsiteSetup.onsiteSetup);
        },
        next: fullOnsiteSetup => {
          this.#persistOnsiteSetupStorage(fullOnsiteSetup, formValue.placeId);
          this.#dialogRef.close(ossOnsiteSetup.onsiteSetup);
        },
      });
  }

  activateVenueSearch(): void {
    this.isVenueSearchActive.set(true);
    afterNextRender(() => this.#focusVenueSearchInput(), { injector: this.#injector });
  }

  deactivateVenueSearch(): void {
    this.venueSearchFormControl.setValue('');
    this.venueSearchTerm.set('');
    this.isVenueSearchActive.set(false);
  }

  ngOnInit(): void {
    this.hasActiveShiftAndPreviousOnsiteSetup.set(this.#dialogData.hasActiveShiftAndActiveOnsiteSetup);
    this.#preselectedOnsiteSetupId = this.#dialogData.preselectedOnsiteSetupId;
    this.#preselectedVenueId = this.#dialogData.preselectedVenueId;
    this.#initForm();
    this.#onsiteSetupStore.ensureSummaryLoaded();
    this.#loadRecentOnsiteSetups();
    if (this.#onsiteSetupStore.onsiteSetupsSummary() && !this.#initialVenueSelectionApplied) {
      this.#initialVenueSelectionApplied = true;
      this.#applyInitialVenueSelection();
    }
    this.userName = this.#userService.getUser()?.name ?? null;
    this.#focusVenueSearchInput();
  }

  onSearchEnterKey(): void {
    if (this.shouldShowSetups() && this.onsiteSetupOptions().length > 0) {
      this.selectOnsiteSetup(this.onsiteSetupOptions()[0]);
      return;
    }

    if (this.filteredPlaceOptions().length > 0) {
      this.selectVenue(this.filteredPlaceOptions()[0]);
    }
  }

  selectOnsiteSetup(option: SelectOption): void {
    this.form.patchValue({ onsiteSetupId: option.id });
    this.selectedOnsiteSetupOption.set(this.onsiteSetupOptions().find(setup => setup.id === option.id) || null);

    this.#tryAutoAccept();
  }

  selectRecentOnsiteSetup(recent: RecentOnsiteSetupOption): void {
    this.#rememberOnsiteSetup(recent.id);
    this.#applyRecentOnsiteSetup(recent.id);
  }

  selectVenue(place: PlaceOption): void {
    if (!place?.id || place?.id === this.selectedPlace()?.id) {
      return;
    }

    this.form.patchValue({ cityId: place.cityId, placeId: place.id, placeName: place.name });
    this.selectedPlace.set(place);
    this.form.get('onsiteSetupId')?.reset();
    this.selectedOnsiteSetupOption.set(null);
    this.#loadOnsiteSetupsFromSummary(place.id);
  }

  updateVenueSearch(searchTerm: string): void {
    this.venueSearchFormControl.setValue(searchTerm);
  }

  #applyInitialVenueSelection(): void {
    const places = this.placeOptions();
    if (places.length === 0) {
      return;
    }

    const pendingRecentId = this.pendingRecentSetupSelection();
    if (pendingRecentId) {
      this.pendingRecentSetupSelection.set(null);
      this.#applyRecentOnsiteSetup(pendingRecentId);
      return;
    }

    const currentVenue = this.#getCurrentVenueFromConfig();

    if (currentVenue) {
      this.selectVenue(currentVenue);

      if (this.#preselectedOnsiteSetupId && this.#preselectedVenueId) {
        setTimeout(() => this.#tryAutoAccept(), 100);
      }
      setTimeout(() => this.#scrollToSelectedVenue(currentVenue.id), 100);
      return;
    }

    this.selectVenue(places[0]);
  }

  #applyRecentOnsiteSetup(recentId: string): void {
    if (this.placeOptions().length === 0) {
      this.pendingRecentSetupSelection.set(recentId);
      return;
    }

    this.#onsiteSetupsService
      .getOnsiteSetup(recentId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: error => {
          if (!this.#isOnsiteSetupNotFoundError(error)) {
            return;
          }

          this.#removeRecentOnsiteSetup(recentId);
        },
        next: setup => {
          const placeId = setup.place_id ?? setup.place?.id;
          if (placeId === undefined) {
            return;
          }

          const venue = this.placeOptions().find(place => place.id === placeId);
          if (!venue) {
            return;
          }

          if (this.selectedPlace()?.id !== venue.id) {
            this.selectVenue(venue);
          }

          // `selectVenue` repopulates `onsiteSetupOptions` synchronously from the in-memory summary,
          // so the options below are already up to date for the freshly selected venue.
          const recentSetupOption = this.onsiteSetupOptions().find(option => String(option.id) === recentId);
          if (recentSetupOption) {
            this.selectOnsiteSetup(recentSetupOption);
          }
        },
      });
  }

  #focusVenueSearchInput(): void {
    if (!this.isVenueSearchFieldVisible()) {
      return;
    }

    requestAnimationFrame(() => {
      this.venueSearchInput?.inputElement?.nativeElement?.focus();
    });
  }

  #getCurrentOnsiteSetupFromConfig(): SelectOption | null {
    if (this.#preselectedOnsiteSetupId) {
      return this.onsiteSetupOptions().find(setup => setup.id === this.#preselectedOnsiteSetupId) || null;
    }

    const currentConfig = this.#ossConfigStorageService.getConfiguration();
    if (!currentConfig?.onsiteSetup?.id) {
      return null;
    }

    return this.onsiteSetupOptions().find(setup => setup.id === currentConfig.onsiteSetup.id) || null;
  }

  #getCurrentVenueFromConfig(): PlaceOption | null {
    if (this.#preselectedVenueId) {
      const venueId = parseInt(this.#preselectedVenueId, 10);
      return this.placeOptions().find(venue => venue.id === venueId) || null;
    }

    const currentConfig = this.#ossConfigStorageService.getConfiguration();
    if (!currentConfig?.onsiteSetup?.placeId) {
      return null;
    }

    return this.placeOptions().find(venue => venue.id === currentConfig.onsiteSetup.placeId) || null;
  }

  #initForm(): void {
    this.form = this.#formBuilder.group({
      cityId: ['', Validators.required],
      onsiteSetupId: ['', Validators.required],
      placeId: ['', Validators.required],
      placeName: ['', Validators.required],
    });
  }

  #isOnsiteSetupNotFoundError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse) {
      return error.status === 404;
    }

    const code = (error as { code?: string })?.code;
    return code === 'ONSITE_SETUP_DOES_EXIST';
  }

  #loadOnsiteSetupsFromSummary(placeId: number): void {
    const summary = this.#onsiteSetupStore.onsiteSetupsSummary() ?? EMPTY_ONSITE_SETUPS_SUMMARY;
    const setupOptions = getOnsiteSetupsFromSummary(summary, placeId);

    this.onsiteSetupOptions.set(setupOptions);

    const currentOnsiteSetup = this.#getCurrentOnsiteSetupFromConfig();

    if (currentOnsiteSetup && this.onsiteSetupOptions().length > 0) {
      this.form.patchValue({ onsiteSetupId: currentOnsiteSetup.id });
      this.selectedOnsiteSetupOption.set(this.onsiteSetupOptions().find(setup => setup.id === currentOnsiteSetup.id) || null);
    } else if (this.onsiteSetupOptions().length === 1) {
      this.form.patchValue({ onsiteSetupId: this.onsiteSetupOptions()[0].id });
      this.selectedOnsiteSetupOption.set(this.onsiteSetupOptions()[0]);
    } else {
      this.selectedOnsiteSetupOption.set(null);
    }

    this.#scrollToOnsiteSetupSection();
  }

  #loadRecentOnsiteSetups(): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      this.#storedRecentOnsiteSetups.set([]);
      return;
    }

    const summary = this.#onsiteSetupStore.onsiteSetupsSummary();
    if (summary) {
      this.#storedRecentOnsiteSetups.set(
        this.#recentOnsiteSetupsService.retainRecentOnsiteSetups(partnerId, Object.keys(summary.onsite_setups_by_id)),
      );
      return;
    }

    this.#storedRecentOnsiteSetups.set(this.#recentOnsiteSetupsService.getRecentOnsiteSetups(partnerId));
  }

  #persistOnsiteSetupStorage(onsiteSetup: OnsiteSetup, placeId: number): void {
    this.#onsiteSetupsStorageService.setConfiguration({ ...onsiteSetup, place_id: placeId });
  }

  #rememberOnsiteSetup(setupId: string): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      return;
    }

    this.#recentOnsiteSetupsService.addRecentOnsiteSetup(partnerId, setupId);
    this.#storedRecentOnsiteSetups.set(this.#recentOnsiteSetupsService.getRecentOnsiteSetups(partnerId));
  }

  #removeRecentOnsiteSetup(setupId: string): void {
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      return;
    }

    this.#recentOnsiteSetupsService.removeRecentOnsiteSetup(partnerId, setupId);
    this.#storedRecentOnsiteSetups.set(this.#recentOnsiteSetupsService.getRecentOnsiteSetups(partnerId));
  }

  #scrollToOnsiteSetupSection(): void {
    if ((!this.isMobile() && !this.isTablet()) || !this.onsiteSetupSection?.nativeElement) {
      return;
    }

    setTimeout(() => {
      this.onsiteSetupSection?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }

  #scrollToSelectedVenue(venueId: number): void {
    const venueElement = document.querySelector(`[data-venue-id="${venueId}"]`) as HTMLElement;
    if (venueElement) {
      venueElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }

  #tryAutoAccept(): void {
    if (this.form.valid && this.selectedPlace() && this.selectedOnsiteSetupOption()) {
      this.accept();
    }
  }
}
