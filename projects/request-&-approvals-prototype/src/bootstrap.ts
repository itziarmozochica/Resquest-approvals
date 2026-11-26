import { installMockApi } from './mock/install-mock-api';
import { registerLocaleData } from '@angular/common';
import ar from '@angular/common/locales/ar';
import ca from '@angular/common/locales/ca';
import de from '@angular/common/locales/de';
import es from '@angular/common/locales/es';
import fr from '@angular/common/locales/fr';
import he from '@angular/common/locales/he';
import id from '@angular/common/locales/id';
import it from '@angular/common/locales/it';
import ja from '@angular/common/locales/ja';
import ko from '@angular/common/locales/ko';
import nl from '@angular/common/locales/nl';
import pt from '@angular/common/locales/pt';
import pt_PT from '@angular/common/locales/pt-PT';
import sv from '@angular/common/locales/sv';
import th from '@angular/common/locales/th';
import zh from '@angular/common/locales/zh';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { DatadogBrowser } from './app/core/error/datadog/datadog-browser';
import { SentryBrowser } from './app/core/error/sentry/sentry-browser';
import { environment } from './environments/environment';

// Prototype: serve every API call from in-browser seed data (src/mock)
installMockApi();

// Setup Sentry
SentryBrowser.init();

registerLocaleData(ar);
registerLocaleData(es);
registerLocaleData(fr);
registerLocaleData(pt);
registerLocaleData(pt_PT);
registerLocaleData(it);
registerLocaleData(ko);
registerLocaleData(de);
registerLocaleData(ja);
registerLocaleData(zh);
registerLocaleData(id);
registerLocaleData(ca);
registerLocaleData(sv);
registerLocaleData(nl);
registerLocaleData(he);
registerLocaleData(th);

if (environment.production) {
  enableProdMode();
}

// Setup Datadog
DatadogBrowser.init();

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
