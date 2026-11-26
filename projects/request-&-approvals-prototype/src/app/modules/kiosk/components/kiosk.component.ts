import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { isJest } from '@fz-original/app/app/test/is-jest';
import { KioskErrorModalComponent } from '@fz-original/app/modules/kiosk/shared/components/modals/kiosk-error/kiosk-error-modal.component';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';

import { AuthenticationService } from '../../../core/authentication/authentication.service';
import { DatadogLogLevel } from '../../../core/error/datadog/logger/datadog-log.service';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { OrganizationSummary } from '../../../shared/models/organization/organization-summary.model';
import { Partner } from '../../../shared/models/partner/partner.model';
import { User } from '../../../shared/models/user/user.model';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { UserService } from '../../../shared/services/user/user.service';
import { MessageType, SourceListen, WebviewMessengerService } from '../../../shared/services/webview-messenger/webview-messenger.service';
import { KioskAuth } from '../models/kiosk-auth.model';
import { BookingOtokenStore } from '../services/booking/booking-otoken.store';
import { KioskStorageService } from '../services/kiosk-storage.service';
import { KioskService } from '../services/kiosk.service';
import { KioskNavigationService } from '../shared/kiosk-navigation.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, TranslateModule],
  selector: 'app-kiosk-kiosk',
  styleUrl: '../../../../theme/general/_box-office.scss',
  templateUrl: './kiosk.component.html',
})
export class KioskComponent {
  readonly #authenticationService = inject(AuthenticationService);
  readonly #bookingOtokenStore = inject(BookingOtokenStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(Dialog);
  readonly #kioskNavigationService = inject(KioskNavigationService);
  readonly #kioskService = inject(KioskService);
  readonly #kioskStorageService = inject(KioskStorageService);
  readonly #partnerService = inject(PartnerService);
  readonly #spinnerService = inject(SpinnerService);
  readonly #translate = inject(TranslateService);
  readonly #userService = inject(UserService);
  readonly #webviewMessenger = inject(WebviewMessengerService);
  readonly #kioskError = signal(false);
  readonly kioskError = this.#kioskError.asReadonly();

  constructor() {
    this.#spinnerService.show();
    this.#authenticationService.clearData();
    this.#bookingOtokenStore.clear();
    this.#kioskService.logTrace('Loading Kiosk', DatadogLogLevel.Info);
    this.#waitForApiKey();
  }

  getPartner(organizationId: number, serial: string, onPartner: (partner: Partner) => void): void {
    this.#kioskService.logTrace(`${serial} loading partner`, DatadogLogLevel.Info);
    this.#partnerService.get(organizationId).subscribe(({ data }) => {
      if (!data) {
        this.#kioskError.set(true);
        this.#spinnerService.hide();
        this.#kioskService.logTrace('error retrieving partner', DatadogLogLevel.Warn);
        return;
      }
      onPartner(data);
    });
  }

  /**
   * @todo
   *
   * Refactor to avoid nested subscriptions.
   */
  #checkApiKey(apiKey: string, serial: string = ''): void {
    localStorage.setItem(StorageKey.kioskApi, apiKey);
    this.#getUser(serial, user => {
      this.#getUserOrganizations(user.id, serial, data => {
        this.getPartner(data.organizations[0].id, serial, partner => {
          this.#partnerService.savePartner(partner);
          this.#kioskService
            .getKioskConfigAndSetup({
              errorCallback: (error: { message?: string } | null) => {
                const errorMessage = error !== null && error.message !== undefined ? error.message : 'Error';
                this.#dialog.open(KioskErrorModalComponent, {
                  data: {
                    title: this.#translate.instant('common.errorTitle'),
                    messages: [errorMessage],
                  },
                });
              },
              partnerId: partner.id,
              serial,
            })
            .subscribe(() => this.#kioskNavigationService.navigateHome());
        });
      });
    });
  }

  #checkKioskParams(auth: KioskAuth): void {
    const apiKey = auth?.apiKey;
    if (!apiKey) {
      this.#kioskError.set(true);
      this.#spinnerService.hide();
      return;
    }
    this.#kioskStorageService.setAppParams({
      serial: auth.serial,
      appVersion: auth.appVersion,
    });
    this.#checkApiKey(apiKey, auth.serial);
  }

  #getUser(serial: string, onUser: (user: User) => void): void {
    this.#kioskService.logTrace(`${serial} loading user`, DatadogLogLevel.Info);
    this.#userService.getMe({ skipBusinessDetailsEnrichment: true }).subscribe(({ data: user }) => {
      if (!user) {
        this.#kioskError.set(true);
        this.#spinnerService.hide();
        this.#kioskService.logTrace('error retrieving user', DatadogLogLevel.Warn);
        return this.#authenticationService.logout().subscribe();
      }
      this.#authenticationService.setUserId(user.id);
      onUser(user);
    });
  }

  #getUserOrganizations(userId: number, serial: string, onOrganization: (organization: OrganizationSummary) => void): void {
    this.#kioskService.logTrace(`${serial} loading orgs`, DatadogLogLevel.Info);
    this.#userService.getOrganizations({ userId }).subscribe(({ data }) => {
      if (!data) {
        this.#kioskError.set(true);
        this.#spinnerService.hide();
        this.#kioskService.logTrace('error retrieving organizations', DatadogLogLevel.Warn);
        return;
      }
      onOrganization(data);
    });
  }

  #listenApiKeyManually() {
    this.#authenticationService
      .listenToApiKey()
      .pipe(
        filter((apiKey: string) => apiKey != ''),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((apiKey: string) => {
        const fzDevConfig: unknown | undefined = (globalThis as unknown as Window).fzDevConfig;
        const kioskSerial: string | undefined = (fzDevConfig as { kioskSerial: string | undefined } | undefined)?.kioskSerial;
        if (isJest() || kioskSerial === undefined) {
          /**
           * If no serial is provided in the dev local machine
           * during the Node.JS process,
           * feel free to replace the api key string
           * with the corresponding kiosk you want to test.
           *
           * @example:
           *
           * ```ts
           * this.#checkApiKey(apiKey, 'FV180AE5B8');
           * ```
           */
          this.#checkApiKey(apiKey);
        } else {
          this.#checkApiKey(apiKey, kioskSerial);
        }
      });
  }

  #waitForApiKey(): void {
    this.#webviewMessenger.setUpPage(SourceListen.login);
    this.#webviewMessenger
      .observeOnce<KioskAuth>(MessageType.KioskAuth, { includeUnconsumed: true })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(auth => {
        this.#checkKioskParams(auth);
      });
    this.#listenApiKeyManually();
  }
}
