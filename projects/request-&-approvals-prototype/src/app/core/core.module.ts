import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { inject, LOCALE_ID, NgModule, provideAppInitializer, provideEnvironmentInitializer } from '@angular/core';

import { I18N_DIRECTION, IGNT_DIALOG_TRANSLATIONS, IGNT_TOAST_TRANSLATIONS, IgntMediaQueriesService } from '@ignite/common';
import { IgntIconService } from '@ignite/icon';
import { IGNT_TABLE_TRANSLATIONS } from '@ignite/table';
import { TranslateService } from '@ngx-translate/core';

import { AvailabilityHeadersInterceptor } from '../modules/box-office/point-of-sale/interceptors/availability-headers.interceptor';
import { AddHeadersInterceptor } from '../shared/interceptors/add-headers.interceptor';
import { AuthenticationInterceptor } from '../shared/interceptors/authentication.interceptor';
import { PlanWriteOriginInterceptor } from '../shared/interceptors/plan-write-origin.interceptor';
import { RetryInterceptor } from '../shared/interceptors/retry.interceptor';
import { TimeoutInterceptor } from '../shared/interceptors/timeout.interceptor';
import { DirectionService } from '../shared/services/direction/direction.service';
import { igntDialogTranslationsRootFactory } from './factories/ignite-dialog-translations.factory';
import { igntTableTranslationsRootFactory } from './factories/ignite-table-translations.factory';
import { igntToastTranslationsRootFactory } from './factories/ignite-toast-translations.factory';
import { localeIdFactory } from './factories/locale-id.factory';
import { provideIgniteTranslations } from './factories/provide-ignite-translations';
import { i18nInitializer } from './initializers/i18n.initializer';

@NgModule({
  imports: [],
  declarations: [],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthenticationInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RetryInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AvailabilityHeadersInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TimeoutInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AddHeadersInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: PlanWriteOriginInterceptor,
      multi: true,
    },
    provideEnvironmentInitializer(() => inject(IgntMediaQueriesService).initialize()),
    provideEnvironmentInitializer(() => inject(IgntIconService).preloadAllSets()),
    {
      provide: I18N_DIRECTION,
      useFactory: () => inject(DirectionService).direction,
    },
    provideIgniteTranslations(IGNT_DIALOG_TRANSLATIONS, igntDialogTranslationsRootFactory),
    provideIgniteTranslations(IGNT_TABLE_TRANSLATIONS, igntTableTranslationsRootFactory),
    provideIgniteTranslations(IGNT_TOAST_TRANSLATIONS, igntToastTranslationsRootFactory),
    provideAppInitializer(() => i18nInitializer(inject(TranslateService))()),
    {
      provide: LOCALE_ID,
      useFactory: localeIdFactory,
      deps: [TranslateService],
    },
  ],
})
export class CoreModule {}
