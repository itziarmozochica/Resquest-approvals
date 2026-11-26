import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  signal,
  untracked,
  viewChild,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, Validators, type AbstractControl, type FormGroup, type ValidationErrors } from '@angular/forms';

import {
  findPlaceSummary,
  getOnsiteSetupOptionsFromSummary,
  isOnsiteSetupNotFoundError,
  OnsiteSetupStore,
  TicketingOnsiteSetupSelectionService,
  TicketingOnsiteSetupService,
  TicketingOnsiteSetupStorageService,
  TicketingRecentOnsiteSetupsService,
  type OnsiteSetupOption,
  type OnsiteSetupSelection,
  type OnsiteSetupSummary,
  type OnsiteSetupVenueOption,
} from '@fz/ticketing';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { finalize } from 'rxjs';

import { FztOnsiteSetupTranslationsDirective } from '../../directives/onsite-setup-translations.directive';
import type { FztOnsiteSetupModalData, FztOnsiteSetupModalResult, FztRecentOnsiteSetupOption } from '../../models/onsite-setup-modal.model';
import { FZT_ONSITE_SETUP_TRACKER } from '../../tokens/onsite-setup-tracker.token';
import { FztOnsiteSetupRecentsComponent } from '../onsite-setup-recents/onsite-setup-recents.component';
import { FztOnsiteSetupSetupPickerComponent } from '../onsite-setup-setup-picker/onsite-setup-setup-picker.component';
import { FztOnsiteSetupVenuePickerComponent } from '../onsite-setup-venue-picker/onsite-setup-venue-picker.component';

interface FztOnsiteSetupModalForm {
  cityId: FormControl<number | null>;
  onsiteSetupId: FormControl<string | null>;
  placeId: FormControl<number | null>;
  placeName: FormControl<string | null>;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'fzt-onsite-setup-modal',
  },
  hostDirectives: [FztOnsiteSetupTranslationsDirective],
  imports: [FztOnsiteSetupRecentsComponent, FztOnsiteSetupSetupPickerComponent, FztOnsiteSetupVenuePickerComponent, IgntDialogModule],
  selector: 'fzt-onsite-setup-modal',
  styleUrl: './onsite-setup-modal.component.scss',
  templateUrl: './onsite-setup-modal.component.html',
})
export class FztOnsiteSetupModalComponent implements OnInit {
  static readonly venueSearchThreshold = 8;

  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogData = inject<FztOnsiteSetupModalData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<FztOnsiteSetupModalResult>>(IGNT_DIALOG_REF);
  readonly #formBuilder = inject(FormBuilder);
  readonly #injector = inject(Injector);
  readonly #onsiteSetupService = inject(TicketingOnsiteSetupService);
  readonly #onsiteSetupStore = inject(OnsiteSetupStore);
  readonly #recentOnsiteSetupsService = inject(TicketingRecentOnsiteSetupsService);
  readonly #selectionService = inject(TicketingOnsiteSetupSelectionService);
  readonly #storageService = inject(TicketingOnsiteSetupStorageService);
  readonly #tracker = inject(FZT_ONSITE_SETUP_TRACKER, { optional: true });
  readonly #storedRecentOnsiteSetupIds: WritableSignal<readonly string[]> = signal<readonly string[]>([]);
  #form!: FormGroup<FztOnsiteSetupModalForm>;
  #initialVenueSelectionApplied = false;
  #isAccepting = false;
  #preselectedOnsiteSetupId = '';
  #preselectedVenueId = '';
  #previousOnsiteSetupId: string | null = null;

  private readonly setupPicker = viewChild(FztOnsiteSetupSetupPickerComponent);
  private readonly venuePicker = viewChild(FztOnsiteSetupVenuePickerComponent);

  protected readonly hasActiveShiftAndPreviousOnsiteSetup: boolean = this.#dialogData.hasActiveShiftAndActiveOnsiteSetup;
  protected readonly hasCloseButton: boolean = this.#dialogData.hasCloseButton;
  protected readonly userName: string | null = this.#dialogData.userName;
  protected readonly translations = inject(FztOnsiteSetupTranslationsDirective).translations;
  protected readonly venueOptions: Signal<readonly OnsiteSetupVenueOption[]> = this.#onsiteSetupStore.venueOptions;
  protected readonly venueSearchFormControl = new FormControl<string>('', { nonNullable: true });
  protected readonly isVenueSearchActive: WritableSignal<boolean> = signal(false);
  protected readonly onsiteSetupOptions: WritableSignal<readonly OnsiteSetupOption[]> = signal<readonly OnsiteSetupOption[]>([]);
  protected readonly pendingRecentSetupSelection: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly selectedOnsiteSetupOption: WritableSignal<OnsiteSetupOption | null> = signal<OnsiteSetupOption | null>(null);
  protected readonly selectedVenue: WritableSignal<OnsiteSetupVenueOption | null> = signal<OnsiteSetupVenueOption | null>(null);
  protected readonly venueSearchTerm: WritableSignal<string> = signal('');

  protected readonly greetingTitle: Signal<string> = computed(() =>
    this.translations().greetingsTitle.replace('{{userName}}', this.userName ?? ''),
  );
  protected readonly isVenueSearchVisible: Signal<boolean> = computed(
    () => this.venueOptions().length > FztOnsiteSetupModalComponent.venueSearchThreshold,
  );
  protected readonly filteredVenueOptions: Signal<readonly OnsiteSetupVenueOption[]> = computed(() => {
    const venues = this.venueOptions();
    if (!this.isVenueSearchVisible()) {
      return venues;
    }

    const searchTerm = this.venueSearchTerm().toLowerCase().trim();
    if (searchTerm === '') {
      return venues;
    }

    return venues.filter(venue => venue.name.toLowerCase().includes(searchTerm));
  });
  protected readonly recentOnsiteSetups: Signal<FztRecentOnsiteSetupOption[]> = computed(() => {
    const summary = this.#onsiteSetupStore.onsiteSetupsSummary();
    const setupsById: Partial<Record<string, OnsiteSetupSummary>> = summary?.onsiteSetupsById ?? {};

    return this.#storedRecentOnsiteSetupIds()
      .map(recentId => ({ id: recentId, name: setupsById[recentId]?.name ?? '' }))
      .filter(option => option.name !== '');
  });
  protected readonly isRecentSectionVisible: Signal<boolean> = computed(
    () => this.recentOnsiteSetups().length > 0 && !this.isVenueSearchActive(),
  );
  protected readonly isVenueSearchFieldVisible: Signal<boolean> = computed(
    () => this.isVenueSearchActive() || (this.isVenueSearchVisible() && this.recentOnsiteSetups().length === 0),
  );
  protected readonly modalTitle: Signal<string> = computed(() => {
    const baseTitle = this.translations().title;
    const selectedSetup = this.selectedOnsiteSetupOption();

    return selectedSetup !== null && selectedSetup.title !== '' ? `${baseTitle} - ${selectedSetup.title}` : baseTitle;
  });
  protected readonly shouldShowSetups: Signal<boolean> = computed(() => {
    if (!this.isVenueSearchVisible()) {
      return true;
    }

    const searchTerm = this.venueSearchTerm().toLowerCase().trim();
    if (searchTerm === '') {
      return true;
    }

    const selectedVenueId = this.selectedVenue()?.id;
    if (selectedVenueId === undefined) {
      return false;
    }

    return this.filteredVenueOptions().some(venue => venue.id === selectedVenueId);
  });

  constructor() {
    effect(() => {
      const summary = this.#onsiteSetupStore.onsiteSetupsSummary();
      if (!summary || this.#initialVenueSelectionApplied) {
        return;
      }

      this.#initialVenueSelectionApplied = true;
      untracked(() => {
        this.#loadRecentOnsiteSetups();
        this.#applyInitialVenueSelection();
      });
    });

    this.venueSearchFormControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => {
      this.venueSearchTerm.set(value);
      if (value.trim() !== '') {
        this.#form.controls.onsiteSetupId.reset();
        this.selectedOnsiteSetupOption.set(null);
      }
    });
  }

  accept(): void {
    if (this.hasActiveShiftAndPreviousOnsiteSetup) {
      this.#dialogRef.close(undefined);

      return;
    }

    if (this.#isAccepting) {
      return;
    }

    this.#isAccepting = true;

    const formValue = this.#form.getRawValue();
    const placeId = formValue.placeId ?? 0;
    const summary = this.#onsiteSetupStore.onsiteSetupsSummary();
    const placeSummary = summary === null ? undefined : findPlaceSummary(summary, placeId);
    const selectedSetup = this.selectedOnsiteSetupOption();
    const selectedSetupTitle = selectedSetup?.title ?? '';

    const selection: OnsiteSetupSelection = {
      cityId: formValue.cityId ?? 0,
      id: String(formValue.onsiteSetupId),
      placeCountryCode: placeSummary?.countryIsoCode2,
      placeId,
      placeName: formValue.placeName ?? '',
    };

    if (this.#previousOnsiteSetupId !== selection.id) {
      this.#tracker?.trackSetupChanged(this.#previousOnsiteSetupId, selection.id);
    }

    this.#selectionService
      .confirmSelection(selection, this.#dialogData.partnerId, selectedSetupTitle)
      .pipe(
        finalize(() => {
          this.#isAccepting = false;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        complete: () => {
          this.#dialogRef.close(selection);
        },
      });
  }

  activateVenueSearch(): void {
    this.isVenueSearchActive.set(true);
    afterNextRender(
      () => {
        this.#focusVenueSearchInput();
      },
      { injector: this.#injector },
    );
  }

  deactivateVenueSearch(): void {
    this.venueSearchFormControl.setValue('');
    this.venueSearchTerm.set('');
    this.isVenueSearchActive.set(false);
  }

  ngOnInit(): void {
    this.#preselectedOnsiteSetupId = this.#dialogData.preselectedOnsiteSetupId ?? '';
    this.#preselectedVenueId = this.#dialogData.preselectedVenueId ?? '';
    this.#previousOnsiteSetupId = this.#storageService.getOnsiteSetupConfig()?.id ?? null;
    this.#initForm();
    this.#onsiteSetupStore.ensureSummaryLoaded({ partnerId: this.#dialogData.partnerId });
    this.#loadRecentOnsiteSetups();
    if (this.#onsiteSetupStore.onsiteSetupsSummary() && !this.#initialVenueSelectionApplied) {
      this.#initialVenueSelectionApplied = true;
      this.#applyInitialVenueSelection();
    }
    afterNextRender(
      () => {
        this.#focusVenueSearchInput();
      },
      { injector: this.#injector },
    );
  }

  onSearchEnterKey(): void {
    if (this.shouldShowSetups() && this.onsiteSetupOptions().length > 0) {
      this.selectOnsiteSetup(this.onsiteSetupOptions()[0]);

      return;
    }

    if (this.filteredVenueOptions().length > 0) {
      this.selectVenue(this.filteredVenueOptions()[0]);
    }
  }

  selectOnsiteSetup(option: OnsiteSetupOption): void {
    this.#form.patchValue({ onsiteSetupId: option.id });
    this.selectedOnsiteSetupOption.set(this.onsiteSetupOptions().find(setup => setup.id === option.id) ?? null);

    this.#tryAutoAccept();
  }

  selectRecentOnsiteSetup(recent: FztRecentOnsiteSetupOption): void {
    this.#rememberOnsiteSetup(recent.id);
    this.#applyRecentOnsiteSetup(recent.id);
  }

  selectVenue(venue: OnsiteSetupVenueOption): void {
    if (venue.id === this.selectedVenue()?.id) {
      return;
    }

    this.#form.patchValue({ cityId: venue.cityId, placeId: venue.id, placeName: venue.name });
    this.selectedVenue.set(venue);
    this.#form.controls.onsiteSetupId.reset();
    this.selectedOnsiteSetupOption.set(null);
    this.#loadOnsiteSetupsFromSummary(venue.id);
  }

  #applyInitialVenueSelection(): void {
    const venues = this.venueOptions();
    if (venues.length === 0) {
      return;
    }

    const pendingRecentId = this.pendingRecentSetupSelection();
    if (pendingRecentId !== null) {
      this.pendingRecentSetupSelection.set(null);
      this.#applyRecentOnsiteSetup(pendingRecentId);

      return;
    }

    const currentVenue = this.#getCurrentVenueFromConfig();
    if (currentVenue) {
      this.selectVenue(currentVenue);

      if (this.#preselectedOnsiteSetupId !== '' && this.#preselectedVenueId !== '') {
        setTimeout(() => {
          this.#tryAutoAccept();
        }, 100);
      }
      setTimeout(() => {
        this.venuePicker()?.scrollToVenue(currentVenue.id);
      }, 100);

      return;
    }

    this.selectVenue(venues[0]);
  }

  #applyRecentOnsiteSetup(recentId: string): void {
    if (this.venueOptions().length === 0) {
      this.pendingRecentSetupSelection.set(recentId);

      return;
    }

    this.#onsiteSetupService
      .getOnsiteSetup({ onsiteSetupId: recentId, partnerId: this.#dialogData.partnerId })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => {
          if (!isOnsiteSetupNotFoundError(error)) {
            return;
          }

          this.#removeRecentOnsiteSetup(recentId);
        },
        next: setup => {
          const placeId = setup.place_id ?? setup.place?.id;
          if (placeId === undefined) {
            return;
          }

          const venue = this.venueOptions().find(option => option.id === placeId);
          if (!venue) {
            return;
          }

          if (this.selectedVenue()?.id !== venue.id) {
            this.selectVenue(venue);
          }

          const recentSetupOption = this.onsiteSetupOptions().find(option => option.id === recentId);
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

    this.venuePicker()?.focusSearch();
  }

  #getCurrentOnsiteSetupFromConfig(): OnsiteSetupOption | null {
    if (this.#preselectedOnsiteSetupId !== '') {
      return this.onsiteSetupOptions().find(setup => setup.id === this.#preselectedOnsiteSetupId) ?? null;
    }

    const storedOnsiteSetupId = this.#storageService.getOnsiteSetupConfig()?.id;
    if (storedOnsiteSetupId === undefined || storedOnsiteSetupId === '') {
      return null;
    }

    return this.onsiteSetupOptions().find(setup => setup.id === storedOnsiteSetupId) ?? null;
  }

  #getCurrentVenueFromConfig(): OnsiteSetupVenueOption | null {
    if (this.#preselectedVenueId !== '') {
      const venueId = parseInt(this.#preselectedVenueId, 10);

      return this.venueOptions().find(venue => venue.id === venueId) ?? null;
    }

    const storedPlaceId = this.#storageService.getOnsiteSetupConfig()?.place_id;
    if (storedPlaceId === undefined || storedPlaceId === 0) {
      return null;
    }

    return this.venueOptions().find(venue => venue.id === storedPlaceId) ?? null;
  }

  #initForm(): void {
    this.#form = this.#formBuilder.group<FztOnsiteSetupModalForm>({
      cityId: new FormControl<number | null>(null, requiredValidator),
      onsiteSetupId: new FormControl<string | null>(null, requiredValidator),
      placeId: new FormControl<number | null>(null, requiredValidator),
      placeName: new FormControl<string | null>(null, requiredValidator),
    });
  }

  #loadOnsiteSetupsFromSummary(placeId: number): void {
    const summary = this.#onsiteSetupStore.onsiteSetupsSummary();
    const setupOptions = summary === null ? [] : getOnsiteSetupOptionsFromSummary(summary, placeId);

    this.onsiteSetupOptions.set(setupOptions);

    const currentOnsiteSetup = this.#getCurrentOnsiteSetupFromConfig();

    if (currentOnsiteSetup && setupOptions.length > 0) {
      this.#form.patchValue({ onsiteSetupId: currentOnsiteSetup.id });
      this.selectedOnsiteSetupOption.set(setupOptions.find(setup => setup.id === currentOnsiteSetup.id) ?? null);
    } else if (setupOptions.length === 1) {
      this.#form.patchValue({ onsiteSetupId: setupOptions[0].id });
      this.selectedOnsiteSetupOption.set(setupOptions[0]);
    } else {
      this.selectedOnsiteSetupOption.set(null);
    }

    this.#scrollToOnsiteSetupSection();
  }

  #loadRecentOnsiteSetups(): void {
    const partnerId = this.#dialogData.partnerId;
    const summary = this.#onsiteSetupStore.onsiteSetupsSummary();
    const recents =
      summary === null
        ? this.#recentOnsiteSetupsService.getRecentOnsiteSetups(partnerId)
        : this.#recentOnsiteSetupsService.retainRecentOnsiteSetups(partnerId, Object.keys(summary.onsiteSetupsById));

    this.#storedRecentOnsiteSetupIds.set(recents.map(recent => recent.id));
  }

  #rememberOnsiteSetup(setupId: string): void {
    const partnerId = this.#dialogData.partnerId;

    this.#recentOnsiteSetupsService.addRecentOnsiteSetup(partnerId, setupId);
    this.#storedRecentOnsiteSetupIds.set(this.#recentOnsiteSetupsService.getRecentOnsiteSetups(partnerId).map(recent => recent.id));
  }

  #removeRecentOnsiteSetup(setupId: string): void {
    const partnerId = this.#dialogData.partnerId;

    this.#recentOnsiteSetupsService.removeRecentOnsiteSetup(partnerId, setupId);
    this.#storedRecentOnsiteSetupIds.set(this.#recentOnsiteSetupsService.getRecentOnsiteSetups(partnerId).map(recent => recent.id));
  }

  #scrollToOnsiteSetupSection(): void {
    if (!this.#dialogData.isMobileOrTablet) {
      return;
    }

    setTimeout(() => {
      this.setupPicker()?.scrollIntoView();
    }, 100);
  }

  #tryAutoAccept(): void {
    if (this.#form.valid && this.selectedVenue() && this.selectedOnsiteSetupOption()) {
      this.accept();
    }
  }
}

function requiredValidator(control: AbstractControl): ValidationErrors | null {
  return Validators.required(control);
}
