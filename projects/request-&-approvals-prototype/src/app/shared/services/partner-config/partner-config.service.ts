import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken, signal } from '@angular/core';

import { IconName } from '@fortawesome/fontawesome-svg-core';
import { PaymentMethodOption } from '@fz-original/app/modules/box-office/checkout/models/payment-method.model';
import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { PartnerConfig } from '@fz-original/app/shared/models/partner/partner-config.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { EMPTY, Observable, of, ReplaySubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PartnerConfigService {
  static readonly configExistMap: { [key: string]: boolean } = {
    12759: true,
    1916: true,
    11380: true,
    3118: true,
    12989: true, // Paradox Museum - London
    14703: true, // Paradox Museum - Mumbai
    14905: true, // Paradox Museum - Paris
    25757: true, // Paradox Museum - Miami
    26156: true, // Prison Island Valence
    26355: true, // Catedral de Segovia
    33678: true, // Paradox Museum - Stockholm
    37241: true, // Goodlife Escape Sports & Amusement Tracks
    29618: true, // Expedition Marseille
    26654: true, // Cités Immersives
    45524: true, // Out4Blood
    68982: true, // Escape This Pty Ltd
    11774: true, // JP Morgan
    140540: true, // sarl-eak
    141479: true, // Golfea Group SAS
    142300: true, // Defence Collective Singapore Ltd
    144082: true, // Prison Island Toulouse
    142822: true, // Prison Island Montpellier
    144081: true, // Prison Island Nîmes
    144083: true, // Prison Island Grenoble
    144077: true, // Prison Island Clermont-Ferrand
    144071: true, // Prison Island Orléans
    144073: true, // Prison Island Marseille
    144074: true, // Prison Island Tours
    144075: true, // Prison Island Saint Avertin
    144069: true, // Prison Island Avignon
    144080: true, // Prison Island Braga
    29455: true, // Arriba el Telón Arg
    25591: true, // Arriba el Telón
    149654: true, // Accor IRIS - For testing and training only
    2073: true, // Accor IRIS Test,
    13379: true, // Accor SA
  };
  static readonly defaultSupportEmail = 'mailto:partners@example.com';
  #httpClient = inject(HttpClient);
  #partnerService = inject(PartnerService);
  #userService = inject(UserService);

  get config(): Readonly<PartnerConfig> | null {
    return this._config;
  }

  set config(value: Readonly<PartnerConfig> | null) {
    this._config = !value ? null : { ...value, ...this._config };
    this._subject.next(this._config);
  }

  get supportEmailLink(): string {
    return this._config?.supportData?.contactEmailLink ?? PartnerConfigService.defaultSupportEmail;
  }

  $config: Observable<PartnerConfig | null>;
  contactLink = signal<string>('');
  private _subject: ReplaySubject<PartnerConfig | null>;

  constructor() {
    this._subject = new ReplaySubject<PartnerConfig | null>(1);
    this.$config = this._subject.asObservable();
  }

  private _config: Readonly<PartnerConfig> | null = null;

  addCustomPaymentMethods(baseMethods: PaymentType[], iconsMap: Map<PaymentType, IconName>): PaymentType[] {
    if (!this._config?.payments?.customMethods) {
      return baseMethods;
    }

    const customPaymentTypes: PaymentType[] = [];

    this._config.payments.customMethods.forEach(customMethod => {
      const paymentMethodKey = customMethod.method.toUpperCase() as keyof typeof PaymentType;
      if (paymentMethodKey in PaymentType) {
        const paymentType = PaymentType[paymentMethodKey];
        customPaymentTypes.push(paymentType);

        if (customMethod.icon) {
          iconsMap.set(paymentType, customMethod.icon as IconName);
        }
      }
    });

    return [...baseMethods, ...customPaymentTypes];
  }

  getCustomPaymentMethodLabel(paymentType: PaymentType): string | null {
    if (!this._config?.payments?.customMethods) {
      return null;
    }

    const customMethod = this._config.payments.customMethods.find(method => method.method.toUpperCase() === paymentType.toUpperCase());

    return customMethod?.label || null;
  }

  getCustomPaymentMethodOptions(cartAmountIsZero: boolean = false): PaymentMethodOption[] {
    if (!this._config?.payments?.customMethods) {
      return [];
    }

    const customOptions: PaymentMethodOption[] = [];

    this._config.payments.customMethods.forEach(customMethod => {
      const paymentMethodKey = customMethod.method.toUpperCase() as keyof typeof PaymentType;

      if (paymentMethodKey in PaymentType) {
        const paymentType = PaymentType[paymentMethodKey];

        customOptions.push({
          method: paymentType,
          label: customMethod.label,
          ...(customMethod.icon ? { icon: ['fal', customMethod.icon as IconName] } : {}),
          disabled: cartAmountIsZero,
        });
      }
    });

    return customOptions;
  }

  init(partnerId: number | null): void {
    if (partnerId === null) {
      return;
    }
    const request: Observable<PartnerConfig | null> = !PartnerConfigService.configExistMap[partnerId]
      ? of(null)
      : this.#httpClient.get<PartnerConfig>(`assets/config/${partnerId}.json`);

    request
      .pipe(
        tap((config: PartnerConfig | null) => {
          this.config = config;
          this.#setContactLink();
        }),
        catchError(() => EMPTY),
      )
      .subscribe();
  }

  #setContactLink(): void {
    let link = '';
    if (this._config?.supportData?.contactLink) {
      link = this._config.supportData.contactLink;
    } else if (this.#userService.isBusiness()) {
      link = '/support/business-email';
    } else if (this.#partnerService.isPartner()) {
      link = '/support/email';
    }
    this.contactLink.set(link);
  }
}

export const SCOPED_PARTNER_CONFIG_SERVICE = new InjectionToken<PartnerConfigService>('PartnerConfigService');

export function createScopedInstance() {
  return new PartnerConfigService();
}
