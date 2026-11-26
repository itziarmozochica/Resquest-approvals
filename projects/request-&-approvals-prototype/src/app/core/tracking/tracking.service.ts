import { inject, Inject, Injectable, Optional } from '@angular/core';

import { DeviceService } from '@fz-original/app/shared/services/device/device.service';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

import packageJson from '../../../../package.json';
import { Partner } from '../../shared/models/partner/partner.model';
import { User } from '../../shared/models/user/user.model';
import { PartnerService } from '../../shared/services/partner/partner.service';
import { UserService } from '../../shared/services/user/user.service';
import { TrackingContext } from './tracking-context';
import { TrackingEvent } from './tracking-event';
import { TrackingProvider } from './tracking-provider';
import { TRACKERS, TRACKING_ENABLED } from './tracking-tokens';

@Injectable()
export class TrackingService {
  #deviceService: DeviceService = inject(DeviceService);
  private globalProperties: { [key: string]: any } = {};
  private subject = new Subject<TrackingContext<any>>();
  private partner: Partner | null = null;
  private user: User | null = null;

  constructor(
    @Optional() @Inject(TRACKERS) trackers: TrackingProvider[],
    @Optional() @Inject(TRACKING_ENABLED) private enabled: boolean,
    private partnerService: PartnerService,
    private userService: UserService,
  ) {
    const observable = this.subject.asObservable().pipe(filter(() => this.enabled));

    trackers.forEach(tracker => tracker.subscribe(observable));
  }

  track(event: TrackingEvent<any>, include: string[] = [], exclude: string[] = []): void {
    if (!event || typeof event !== 'object' || !event.id || typeof event.id !== 'string') {
      throw new Error('Event argument must be an object and have a property named "id"');
    }

    this.partner = this.partnerService.getPartner();

    this.user = this.userService.getUser();

    const dataWithPartnersData = {
      ...event.data,
      partner_id: this.partner?.id,
      partner_country: this.partner?.countryCode,
      partner_name: this.partner?.name,
      feverzone_version: packageJson.version,
      user_email: this.user?.email,
      user_name: this.user?.name,
      device: this.#deviceService.getDeviceType(),
    };

    const eventWithPartnersData = new TrackingEvent(event.id, dataWithPartnersData);
    this.subject.next({
      event: eventWithPartnersData,
      include,
      exclude,
      global: this.globalProperties,
    });
  }

  enable(enabled: boolean): void {
    this.enabled = enabled;
  }

  setGlobalProperty(name: string, value: any): void {
    this.globalProperties[name] = value;
  }

  unsetGlobalProperty(name: string): void {
    delete this.globalProperties[name];
  }
}
