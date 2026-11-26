import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';

import { ContactSupportBannerFacade } from './services/contact-support-banner.facade';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, TranslateModule],
  providers: [ContactSupportBannerFacade],
  selector: 'app-contact-support-banner',
  styleUrl: './contact-support-banner.component.scss',
  templateUrl: './contact-support-banner.component.html',
})
export class ContactSupportBannerComponent {
  protected readonly facade = inject(ContactSupportBannerFacade);
}
