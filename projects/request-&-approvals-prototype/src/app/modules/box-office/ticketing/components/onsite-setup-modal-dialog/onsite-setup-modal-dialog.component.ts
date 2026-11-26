import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal, Signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { OpenOnsiteSetupModalEvent } from '@fz-original/app/core/tracking/core/events/open-onsite-setup-modal';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups.service';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { TypeaheadModule } from '@fz-original/app/shared/layout/filters/typeahead/typeahead.module';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { SearchBarService } from '@fz-original/app/shared/search-bar/service/search-bar.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-onsite-setup-modal-dialog',
  standalone: true,
  imports: [TranslateModule, TypeaheadModule, IgntButtonComponent, IgntIconComponent],
  templateUrl: './onsite-setup-modal-dialog.component.html',
  styleUrls: ['./onsite-setup-modal-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnsiteSetupModalDialogComponent implements OnInit {
  #destroyRef = inject(DestroyRef);
  #dialogRef = inject(DialogRef<OnsiteSetup | null>);
  #onsiteSetupsService = inject(OnsiteSetupsService);
  #partnerService = inject(PartnerService);
  #searchBarService = inject(SearchBarService);
  #trackingService = inject(TrackingService);
  #translateService = inject(TranslateService);
  #userService = inject(UserService);

  onsiteSetupList: WritableSignal<Array<OnsiteSetup>> = signal([]);
  onsiteSetupOptions: WritableSignal<Array<SelectOption>> = signal([]);
  selectedOnsiteSetupOption: WritableSignal<SelectOption | null> = signal(null);
  title: WritableSignal<string> = signal('');
  warningBody: WritableSignal<string | null> = signal(null);
  partner: WritableSignal<Partner | null> = signal(null);
  placeOptions: WritableSignal<Array<SelectOption>> = signal([]);
  selectedPlace: WritableSignal<SelectOption | null> = signal(null);
  loadingPlaces: WritableSignal<boolean> = signal(false);
  loadingOnsiteSetups: WritableSignal<boolean> = signal(false);
  hasHiddenSetupsOnly: WritableSignal<boolean> = signal(false);
  showVenuePicker: Signal<boolean> = computed(() => !this.warningBody() || this.hasHiddenSetupsOnly());

  ngOnInit(): void {
    this.#trackOnsiteSetupModelOpened();
    this.partner.set(this.#partnerService.getPartner());
    this.#getPlanPlaces();
  }

  #updateOnsiteSetups(onsiteSetups: Array<OnsiteSetup>): void {
    this.onsiteSetupList.set(onsiteSetups);
    this.onsiteSetupOptions.set(
      onsiteSetups?.map(({ id, name }) => ({
        id,
        title: name === 'default' ? this.#translateService.instant('boxOffice.setup.default') : name,
      })) ?? [],
    );
    this.#updateInfoModal();
  }

  #getPlanPlaces(): void {
    const currentPartner = this.partner();
    if (!currentPartner?.id) {
      return;
    }

    this.loadingPlaces.set(true);
    this.#searchBarService
      .getSearchBarOptions(currentPartner.id)
      .pipe(
        finalize(() => this.loadingPlaces.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(
        response => {
          const places = response?.data?.places;
          const uniquePlaceOptions = Array.from(new Set(places));

          const placeOpts = uniquePlaceOptions.reduce<Array<SelectOption>>((acc, curr) => {
            const placeOption = { id: curr.id, title: curr.name };
            const isDuplicate = acc.some(op => op.id === placeOption.id);
            if (!isDuplicate) {
              acc.push(placeOption);
            }
            return acc;
          }, []);

          this.placeOptions.set(placeOpts);

          if (placeOpts.length === 0) {
            this.selectedPlace.set(null);
            return;
          }

          this.selectedPlace.set(placeOpts[0]);
          const firstPlace = this.selectedPlace();
          if (firstPlace) {
            this.#loadOnsiteSetups(firstPlace.id);
          }
        },
        () => {},
      );
  }

  selectPlace(place: SelectOption): void {
    this.selectedPlace.set(place);
    this.#resetPreviousValuesSelected();
    this.#loadOnsiteSetups(place?.id);
  }

  #loadOnsiteSetups(placeId: number, onsiteSetup?: OnsiteSetup): void {
    if (!placeId) {
      return;
    }
    this.loadingOnsiteSetups.set(true);
    this.#onsiteSetupsService
      .getSelectableOnsiteSetups(placeId)
      .pipe(
        finalize(() => this.loadingOnsiteSetups.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ hasHiddenSetupsOnly, setups }) => {
        this.loadingOnsiteSetups.set(false);
        this.hasHiddenSetupsOnly.set(hasHiddenSetupsOnly);
        this.#updateOnsiteSetups(setups);
        this.#updateInfoModal();
        if (setups.length === 1) {
          this.#updateSelectedOnsiteSetupOption(setups[0]);
        } else if (onsiteSetup) {
          this.#updateSelectedOnsiteSetupOption(onsiteSetup);
        } else {
          const defaultSetup = setups.find(setup => setup.name === 'default');
          this.#updateSelectedOnsiteSetupOption(defaultSetup ?? setups[0]);
        }
      });
  }

  #updateSelectedOnsiteSetupOption(onsiteSetup: OnsiteSetup | undefined): void {
    if (!onsiteSetup) {
      this.selectedOnsiteSetupOption.set(null);
      return;
    }
    const options = this.onsiteSetupOptions();
    this.selectedOnsiteSetupOption.set(options.find(option => option.id === onsiteSetup.id) ?? null);
  }

  #resetPreviousValuesSelected(): void {
    this.onsiteSetupList.set([]);
    this.onsiteSetupOptions.set([]);
    this.selectedOnsiteSetupOption.set(null);
    this.hasHiddenSetupsOnly.set(false);
    this.warningBody.set(null);
  }

  #updateInfoModal(): void {
    let titleKey = 'boxOffice.setup.modal.';
    let warningKey: string | null = 'boxOffice.setup.modal.';

    const options = this.onsiteSetupOptions();
    const loading = this.loadingOnsiteSetups();
    const loadingPlaces = this.loadingPlaces();
    const place = this.selectedPlace();

    if ((options?.length > 0 && !loading) || (options?.length === 0 && (loading || loadingPlaces))) {
      titleKey += 'title';
      warningKey = null;
    } else if (!place) {
      titleKey += 'title';
      warningKey = null;
    } else if (this.hasHiddenSetupsOnly()) {
      titleKey += 'hiddenOnlyTitle';
      warningKey += 'hiddenOnlyMessage';
    } else {
      titleKey += 'emptySetupTitle';
      warningKey += 'emptySetupMessage';
    }

    this.title.set(titleKey);
    this.warningBody.set(warningKey);
  }

  accept(): void {
    const setupList = this.onsiteSetupList();
    const selectedOption = this.selectedOnsiteSetupOption();
    const place = this.selectedPlace();
    const user = this.#userService.getUser();

    if (this.loadingOnsiteSetups()) {
      return;
    }

    if (this.hasHiddenSetupsOnly()) {
      this.#dialogRef.close(null);
      return;
    }

    if (setupList.length === 0) {
      this.#onsiteSetupsService
        .createDefaultOnsiteSetup(place?.id)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe((response: OnsiteSetup) => {
          this.#dialogRef.close({ ...response, place_id: place?.id, user_id: user?.id });
        });
    } else {
      const selectedOnsiteSetup = setupList.find(onsiteSetup => onsiteSetup.id === selectedOption?.id);
      if (selectedOnsiteSetup) {
        this.#dialogRef.close({ ...selectedOnsiteSetup, place_id: place?.id, user_id: user?.id });
      }
    }
  }

  cancel(): void {
    this.#dialogRef.close(null);
  }

  #trackOnsiteSetupModelOpened(): void {
    this.#trackingService.track(new OpenOnsiteSetupModalEvent({ manual: false }));
  }

  isAcceptDisabled(): boolean {
    const place = this.selectedPlace();
    const setupList = this.onsiteSetupList();
    const selectedOption = this.selectedOnsiteSetupOption();

    return this.loadingOnsiteSetups() || (!place && setupList?.length === 0) || (!selectedOption && setupList?.length > 0);
  }
}
