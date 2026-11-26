import { NavigationCancel, NavigationEnd, Router, RoutesRecognized } from '@angular/router';

import { filter, map } from 'rxjs/operators';

import { DatadogViewUtils } from './datadog-view.utils';

export function datadogViewStartInitializationFactory(router: Router): () => void {
  return () => {
    let lastStartedNavigation: RoutesRecognized | null = null;
    let lastFinishedNavigation: RoutesRecognized | null = null;

    router.events
      .pipe(
        filter(event => event instanceof RoutesRecognized || event instanceof NavigationCancel || event instanceof NavigationEnd),
        map(event => event as RoutesRecognized | NavigationCancel | NavigationEnd),
      )
      .subscribe((event: RoutesRecognized | NavigationCancel | NavigationEnd) => {
        if (event instanceof NavigationEnd) {
          lastFinishedNavigation = lastStartedNavigation;
          return;
        }

        if (event instanceof NavigationCancel) {
          if (!event.reason.includes('Redirecting') && lastFinishedNavigation) {
            DatadogViewUtils.startView(lastFinishedNavigation.state);
          }

          return;
        }

        lastStartedNavigation = event;
        DatadogViewUtils.startView(event.state);
      });
  };
}
