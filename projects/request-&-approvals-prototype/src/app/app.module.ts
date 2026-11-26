import { DialogModule } from '@angular/cdk/dialog';
import { PlatformLocation } from '@angular/common';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationRef, DoBootstrap, ErrorHandler, inject, NgModule, provideAppInitializer } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';

import { provideTracking, withContext } from '@fz/fz-tracking/src/public-api';
import { provideReservations, withReservationCapability, withReservations } from '@fz/reservations';
import { STORAGE_SERVICE } from '@fz/storage';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { NgIdleKeepaliveModule } from '@ng-idle/keepalive';
import { MissingTranslationHandler, TranslateLoader, TranslateModule, TranslateParser } from '@ngx-translate/core';
import * as Sentry from '@sentry/angular';
import { DeviceDetectorService } from 'ngx-device-detector';
import { MarkdownModule } from 'ngx-markdown';

import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { isWindow } from './app/utils/window/window.util';
import { AuthenticationService } from './core/authentication/authentication.service';
import { bootstrapRootComponent } from './core/bootstrap/bootstrap-root-component';
import { CoreModule } from './core/core.module';
import { DatadogErrorHandler } from './core/error/datadog/logger/datadog-error-handler';
import { DatadogErrorLoggerService } from './core/error/datadog/logger/datadog-error-logger.service';
import { datadogViewStartInitializationFactory } from './core/error/datadog/view/datadog-view-start.initializer';
import { FzErrorHandler } from './core/error/fz-error.handler';
import {
  isEmptyUnhandledRejectionCustomEvent,
  isIgnoredErrorMessage,
  isIgnoredInjectedScriptError,
} from './core/error/ignored_errors_regexp';
import { shouldWriteToConsole } from './core/error/should-write-to-console';
import { feverzoneContextFactory } from './core/factories/feverzone-context.factory';
import { RecordingMissingTranslationHandler } from './core/i18n/recording-missing-translation.handler';
import { TranslationsHttpLoader } from './core/i18n/translations-http.loader';
import { kioskSessionInitializer } from './core/initializers/kiosk-session.initializer';
import { MixpanelTrackingWithMappersModule } from './core/tracking/mixpanel/mixpanel-tracking.module';
import { TrackingModule } from './core/tracking/tracking.module';
import { OboSecondScreenModule } from './modules/box-office/obo-second-screen/obo-second-screen.module';
import { OdooTillLockLinkPrefetchService } from './modules/box-office/odoo-food-and-beverage/services/odoo-till-lock-link-prefetch.service';
import { OnsiteSetupsStorageService } from './modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { getTapToPayDeviceType } from './modules/box-office/shared/utils/tap-to-pay.util';
import { CHECKOUT_PAYMENT_DRIVER } from './modules/checkout/checkout-modal/models/checkout-payment-driver.model';
import { CHECKOUT_PAYMENT_PORT } from './modules/checkout/checkout-modal/models/checkout-payment-port.model';
import { CheckoutPaymentOrchestratorService } from './modules/checkout/checkout-modal/services/checkout-payment-orchestrator/checkout-payment-orchestrator.service';
import { bookingOtokenInterceptor } from './modules/kiosk/services/booking/booking-otoken.interceptor';
import { PartnerModule } from './modules/partner/partner.module';
import { UserModule } from './modules/user/user.module';
import { TAP_TO_PAY_DEVICE_TYPE, TapToPayDeviceType } from './payments/models/tap-to-pay.model';
import { provideAnnouncements } from './shared/announcements/announcements.providers';
import { BookingQuestionsFormGroupModule } from './shared/booking-questions/modules/form-group/form-group.module';
import { scopedOrganizationInterceptor } from './shared/interceptors/scoped-organization/scoped-organization.interceptor';
import { servicesBaseUrlInterceptor } from './shared/interceptors/services-base-url/services-base-url.interceptor';
import { LayoutModule } from './shared/layout/layout.module';
import { SidebarModule } from './shared/layout/sidebar/sidebar.module';
import { SpinnerComponent } from './shared/layout/spinner/spinner.component';
import { OptimizelyModule } from './shared/optimizely/optimizely.module';
import { provideBusinessInitialization } from './shared/services/distributor/business-initialization.providers';
import { EntryPointClientService } from './shared/services/entry-point-client/entry-point-client.service';
import { ErrorLoggerService } from './shared/services/error-logger/error-logger.service';
import { PartnerConfigService } from './shared/services/partner-config/partner-config.service';
import { PartnerLoaderService } from './shared/services/partner-loader/partner-loader.service';
import { ServicesRoutingService } from './shared/services/services-routing/services-routing.service';
import { LocalStorageService } from './shared/services/storage/local-storage.service';
import { TranslateDefaultParamsParser } from './shared/services/translate-default-params-parser/translate-default-params-parser.service';
import { VersionCheckService } from './shared/services/version-checker/version-checker.service';
import { WebviewMessengerService } from './shared/services/webview-messenger/webview-messenger.service';
import { isErrorLike } from './shared/utils/is-error.utils';
import { buildRejectionDiagnostics } from './shared/utils/rejection-diagnostics.util';
import { serializeCustomEventForLog, serializeRejectionForLog } from './shared/utils/rejection-log.util';

export function partnerDynamicLoaderFactory(partnerLoaderService: PartnerLoaderService): () => void {
  return (): void => partnerLoaderService.init();
}

export function traceUnhandledRejectionEvents(): () => void {
  return () => {
    if (isWindow(globalThis)) {
      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent | CustomEvent) => {
        let reason: unknown;
        let promise: Promise<unknown> | undefined;

        if (typeof PromiseRejectionEvent !== 'undefined' && event instanceof PromiseRejectionEvent) {
          reason = event.reason;
          promise = event.promise;
        } else if (event instanceof CustomEvent) {
          reason = event.detail?.reason;
          promise = event.detail?.promise;

          if (reason === undefined && event.detail === null) {
            reason = (event as unknown as { reason?: unknown }).reason;
            promise = (event as unknown as { promise?: Promise<unknown> }).promise;
          }
        }

        // Apply the same ignore policy as Sentry `beforeSend` / DatadogErrorHandler, but against
        // the *original* reason — before it is wrapped below into a generic "Unhandled promise
        // rejection" Error whose message no longer matches the anchored regexes (e.g. a Datadog
        // telemetry "Failed to fetch", FEVERZONE-1AK). Genuine rejections fall through unchanged.
        const reasonStatus = (reason as { status?: number } | null)?.status;
        const reasonMessage = typeof reason === 'string' ? reason : isErrorLike(reason) ? reason.message : undefined;
        const reasonStack = isErrorLike(reason) ? reason.stack : undefined;
        if (isEmptyUnhandledRejectionCustomEvent(event)) {
          return;
        }
        if (reasonStatus === 0 || isIgnoredErrorMessage(reasonMessage) || isIgnoredInjectedScriptError(reasonMessage, reasonStack)) {
          console.warn('Unhandled rejection ignored (matched ignore rules): ', reasonMessage);
          return;
        }

        const forConsole = reason ?? event;
        let rejectionLog: string;
        if ((reason === undefined || reason === null) && event instanceof CustomEvent) {
          rejectionLog = serializeCustomEventForLog(event);
        } else {
          rejectionLog = serializeRejectionForLog(forConsole);
        }

        const eventInfo = {
          detailIsNull: event instanceof CustomEvent && event.detail === null,
          eventType: event.constructor.name,
          eventTypeProperty: event.type,
          hasPromise: promise !== undefined,
          hasReason: reason !== undefined && reason !== null,
        };

        console.error('Unhandled promise rejection source:', forConsole);
        console.error('Event details:', eventInfo);

        let exception: Error;
        const eventDetails = `Event type: ${eventInfo.eventType}, Event type property: ${eventInfo.eventTypeProperty}, Has promise: ${eventInfo.hasPromise}`;

        if (reason === undefined || reason === null) {
          exception = new Error(
            `Unhandled promise rejection (reason was undefined or null)\n\n${eventDetails}\n\nFull event:\n${rejectionLog}`,
          );
        } else if (reason instanceof Event) {
          exception = new Error(
            `Unhandled promise rejection (reason was an Event: ${reason.type})\n\n${eventDetails}\n\nFull:\n${rejectionLog}`,
          );
        } else if (isErrorLike(reason)) {
          exception = new Error(`Unhandled promise rejection:\n\n${eventDetails}\n\n${rejectionLog}`);
          exception.stack = reason.stack ?? exception.stack;
        } else {
          exception = new Error(`Unhandled promise rejection:\n\n${eventDetails}\n\n${rejectionLog}`);
        }

        const diagnostics = buildRejectionDiagnostics(reason, document.visibilityState);

        Sentry.captureException(exception, {
          captureContext: { contexts: { rejection: { ...diagnostics.context } }, tags: { ...diagnostics.tags } },
          mechanism: { handled: false, type: 'onunhandledrejection' },
        });
      });
    }
  };
}

@NgModule({
  declarations: [AppComponent, SpinnerComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    OptimizelyModule.configure(environment.optimizely.key),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useClass: TranslationsHttpLoader,
      },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: RecordingMissingTranslationHandler,
      },
      parser: {
        deps: [PartnerConfigService],
        provide: TranslateParser,
        useClass: TranslateDefaultParamsParser,
      },
    }),
    CoreModule,
    LayoutModule,
    PartnerModule,
    SidebarModule,
    TrackingModule,
    UserModule,
    MixpanelTrackingWithMappersModule,
    DialogModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.serviceWorker.enable,
      registrationStrategy: 'registerWhenStable:30000',
    }),
    NgIdleKeepaliveModule.forRoot(),
    OboSecondScreenModule,
    BookingQuestionsFormGroupModule.configure(),
    IgntSkeletonComponent,
    IgntSkeletonBaseComponent,
    MarkdownModule.forRoot(),
  ],
  providers: [
    provideAnimationsAsync(),
    DeviceDetectorService,
    VersionCheckService,
    ...provideBusinessInitialization(),
    ...provideReservations(
      { baseUrl: environment.apiBaseUrl, gatewayBaseUrl: environment.apiGWBaseUrl },
      withReservations(),
      withReservationCapability(),
    ),
    {
      provide: CHECKOUT_PAYMENT_PORT,
      useExisting: CheckoutPaymentOrchestratorService,
    },
    {
      provide: CHECKOUT_PAYMENT_DRIVER,
      useExisting: CheckoutPaymentOrchestratorService,
    },
    {
      provide: TAP_TO_PAY_DEVICE_TYPE,
      useFactory: (): (() => TapToPayDeviceType | undefined) => {
        const onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
        return () => getTapToPayDeviceType(onsiteSetupsStorageService.getConfiguration());
      },
    },
    {
      provide: STORAGE_SERVICE,
      useExisting: LocalStorageService,
    },
    {
      provide: ErrorLoggerService,
      useClass: DatadogErrorLoggerService,
    },
    {
      provide: Sentry.SentryErrorHandler,
      useValue: Sentry.createErrorHandler({
        logErrors: shouldWriteToConsole(),
        showDialog: false,
      }),
    },
    {
      deps: [Router],
      provide: Sentry.TraceService,
    },
    DatadogErrorHandler,
    {
      provide: ErrorHandler,
      useClass: FzErrorHandler,
    },
    provideAppInitializer(() => kioskSessionInitializer(inject(AuthenticationService), inject(PlatformLocation))()),
    provideAppInitializer(() => {
      const webviewMessenger = inject(WebviewMessengerService);
      inject(ServicesRoutingService);
      inject(EntryPointClientService);
      inject(OdooTillLockLinkPrefetchService);
      webviewMessenger.init();
    }),
    provideAppInitializer(() => {
      const router = inject(Router);
      inject(Sentry.TraceService);
      return datadogViewStartInitializationFactory(router)();
    }),
    provideAppInitializer(() => partnerDynamicLoaderFactory(inject(PartnerLoaderService))()),
    provideAppInitializer(() => traceUnhandledRejectionEvents()()),
    provideHttpClient(
      withInterceptorsFromDi(),
      withInterceptors([bookingOtokenInterceptor, scopedOrganizationInterceptor, servicesBaseUrlInterceptor]),
    ),
    provideTracking(withContext(feverzoneContextFactory)),
    ...provideAnnouncements(),
  ],
})
export class AppModule implements DoBootstrap {
  ngDoBootstrap(appRef: ApplicationRef): void {
    bootstrapRootComponent(appRef, AppComponent);
  }
}
