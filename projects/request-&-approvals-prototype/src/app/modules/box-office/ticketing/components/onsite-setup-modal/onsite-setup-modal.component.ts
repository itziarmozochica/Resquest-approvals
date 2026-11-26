import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { OpenOnsiteSetupModalEvent } from '../../../../../core/tracking/core/events/open-onsite-setup-modal';
import { TrackingService } from '../../../../../core/tracking/tracking.service';
import { SelectOption } from '../../../../../shared/layout/filters/select/select.interface';
import { Partner } from '../../../../../shared/models/partner/partner.model';
import { SearchBarService } from '../../../../../shared/search-bar/service/search-bar.service';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { UserService } from '../../../../../shared/services/user/user.service';
import { OnsiteSetup } from '../../../shared/models/onsite-setup';
import { OnsiteSetupsService } from '../../../shared/services/onsite-setups/onsite-setups.service';

@Component({
  selector: 'app-onsite-setup-modal',
  standalone: false,
  templateUrl: './onsite-setup-modal.component.html',
  styleUrls: ['./onsite-setup-modal.component.scss'],
})
export class OnsiteSetupModalComponent implements OnInit, OnDestroy {
  @Input() set selectedOnsiteSetup(onsiteSetup: OnsiteSetup) {
    if (!onsiteSetup) {
      return;
    }
    this.selectedPlaceId = onsiteSetup.place_id ?? 0;
    this.initSelectedOnsiteSetupOptionId = onsiteSetup.id;
    this.loadOnsiteSetups(this.selectedPlaceId, onsiteSetup);
  }

  @Input() set isActiveShift(isCurrentActiveShift: boolean) {
    this.currentActiveShift = isCurrentActiveShift;
    this.updateInfoModal();
  }
  @Input() manual = false;

  @Output() response = new EventEmitter<OnsiteSetup>();

  onsiteSetupList: Array<OnsiteSetup> = [];
  onsiteSetupOptions: Array<SelectOption> = [];
  selectedOnsiteSetupOption: SelectOption | null = null;
  currentActiveShift = false;
  title = '';
  warningBody: string | null = null;
  partner!: Partner;
  placeOptions: Array<SelectOption> = [];
  selectedPlaceId = 0;
  selectedPlace: SelectOption | null = null;
  loadingPlaces = false;
  loadingOnsiteSetups = false;
  hasHiddenSetupsOnly = false;
  private initSelectedOnsiteSetupOptionId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private partnerService: PartnerService,
    private searchbarService: SearchBarService,
    private onsiteSetupsService: OnsiteSetupsService,
    private translateService: TranslateService,
    private trackingService: TrackingService,
  ) {}

  ngOnInit(): void {
    this.trackOnsiteSetupModelOpened();
    const partner = this.partnerService.getPartner();
    if (partner) {
      this.partner = partner;
    }
    this.getPlanPlaces();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  private updateOnsiteSetups(onsiteSetups: Array<OnsiteSetup>): void {
    this.onsiteSetupList = onsiteSetups;
    this.onsiteSetupOptions =
      onsiteSetups?.map(({ id, name }) => ({
        id,
        title: name === 'default' ? this.translateService.instant('boxOffice.setup.default') : name,
      })) ?? [];
    this.updateInfoModal();
  }

  private getPlanPlaces(): void {
    if (!this.partner?.id) {
      return;
    }

    this.loadingPlaces = true;
    this.searchbarService
      .getSearchBarOptions(this.partner.id)
      .pipe(
        finalize(() => (this.loadingPlaces = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(
        response => {
          const places = response?.data?.places;
          const uniquePlaceOptions = Array.from(new Set(places));

          this.placeOptions = uniquePlaceOptions.reduce((acc: SelectOption[], curr) => {
            const placeOption = { id: curr.id, title: curr.name };

            const isDuplicate = acc.some(op => op.id === placeOption.id);
            if (!isDuplicate) {
              acc.push(placeOption);
            }

            return acc;
          }, []);

          if (this.placeOptions.length === 0) {
            this.selectedPlace = null;
            return;
          }

          const hasSelectedPlaceId = !!this.selectedPlaceId;
          if (hasSelectedPlaceId) {
            this.selectedPlace = this.placeOptions.find((option: SelectOption) => option.id === this.selectedPlaceId) ?? null;
          } else {
            this.selectedPlace = this.placeOptions[0];
          }

          const hasSelectedPlace = !!this.selectedPlace;
          if (hasSelectedPlace && this.selectedPlace) {
            this.loadOnsiteSetups(this.selectedPlace.id);
          }
        },
        () => {},
      );
  }

  selectPlace(place: SelectOption): void {
    this.selectedPlace = place;
    this.resetPreviousValuesSelected();
    this.loadOnsiteSetups(place?.id);
  }

  private loadOnsiteSetups(placeId: number, onsiteSetup?: OnsiteSetup): void {
    if (!placeId) {
      return;
    }
    this.loadingOnsiteSetups = true;
    this.onsiteSetupsService
      .getSelectableOnsiteSetups(placeId)
      .pipe(
        finalize(() => (this.loadingOnsiteSetups = false)),
        takeUntil(this.destroy$),
      )
      .subscribe(({ hasHiddenSetupsOnly, setups }) => {
        this.loadingOnsiteSetups = false;
        this.hasHiddenSetupsOnly = hasHiddenSetupsOnly;
        this.updateOnsiteSetups(setups);
        this.updateInfoModal();
        if (setups.length === 1) {
          this.updateSelectedOnsiteSetupOption(setups[0]);
        } else if (onsiteSetup) {
          this.updateSelectedOnsiteSetupOption(onsiteSetup);
        } else {
          const defaultSetup = setups.find(setup => setup.name === 'default');
          this.updateSelectedOnsiteSetupOption(defaultSetup ?? setups[0]);
        }
      });
  }

  private updateSelectedOnsiteSetupOption(onsiteSetup: OnsiteSetup | undefined): void {
    if (!onsiteSetup) {
      this.selectedOnsiteSetupOption = null;
      return;
    }
    this.selectedOnsiteSetupOption = this.onsiteSetupOptions.find(option => option.id === onsiteSetup.id) ?? null;
  }

  private resetPreviousValuesSelected(): void {
    this.onsiteSetupList = [];
    this.onsiteSetupOptions = [];
    this.selectedOnsiteSetupOption = null;
    this.hasHiddenSetupsOnly = false;
  }

  private updateInfoModal(): void {
    this.title = 'boxOffice.setup.modal.';
    this.warningBody = 'boxOffice.setup.modal.';
    if (this.currentActiveShift) {
      this.title += 'activeShiftTitle';
      this.warningBody += 'activeShiftMessage';
      return;
    }
    if (
      (this.onsiteSetupOptions?.length > 0 && !this.loadingOnsiteSetups) ||
      (this.onsiteSetupOptions?.length === 0 && (this.loadingOnsiteSetups || this.loadingPlaces))
    ) {
      this.title += 'title';
      this.warningBody = null;
      return;
    }
    if (!this.selectedPlace) {
      this.title += 'title';
      this.warningBody = null;
      return;
    }
    if (this.hasHiddenSetupsOnly) {
      this.title += 'hiddenOnlyTitle';
      this.warningBody += 'hiddenOnlyMessage';
      return;
    }
    this.title += 'emptySetupTitle';
    this.warningBody += 'emptySetupMessage';
  }

  accept(): void {
    if (
      this.currentActiveShift ||
      (this.initSelectedOnsiteSetupOptionId && this.initSelectedOnsiteSetupOptionId === this.selectedOnsiteSetupOption?.id)
    ) {
      this.cancel();
      return;
    }

    if (!this.selectedPlace || this.hasHiddenSetupsOnly || this.loadingOnsiteSetups) {
      return;
    }

    const placeId = this.selectedPlace.id;
    const userId = this.userService.getUser()?.id;

    if (this.onsiteSetupList.length === 0) {
      this.onsiteSetupsService
        .createDefaultOnsiteSetup(placeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((response: OnsiteSetup) => {
          this.response.emit({ ...response, place_id: placeId, user_id: userId });
        });
    } else {
      const selectedOnsiteSetup: OnsiteSetup | undefined = this.onsiteSetupList.find(
        onsiteSetup => onsiteSetup.id === this.selectedOnsiteSetupOption?.id,
      );
      if (selectedOnsiteSetup) {
        this.response.emit({ ...selectedOnsiteSetup, place_id: placeId, user_id: userId });
      }
    }
  }

  cancel(): void {
    this.response.emit(undefined);
  }

  private trackOnsiteSetupModelOpened(): void {
    this.trackingService.track(new OpenOnsiteSetupModalEvent({ manual: this.manual }));
  }
}
