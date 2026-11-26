import { RouterStateSnapshot } from '@angular/router';

import { datadogRum, RumEvent } from '@datadog/browser-rum-slim';

import { environment } from '../../../../../environments/environment';
import { viewState } from './datadog-view-state';

export class DatadogViewUtils {
  static startView(state: RouterStateSnapshot): void {
    let viewName = '';
    let route = state.root;
    while (route) {
      viewName = route.data.viewName || viewName;
      route = route.children?.[0];
    }

    const lastView = {
      name: viewName || state.url,
      url: environment.baseUrl + state.url,
    };

    viewState.lastView = lastView;
    datadogRum.startView(lastView.name);
  }

  static updateViewEvent(event: RumEvent): void {
    if (event.type !== 'view') {
      return;
    }

    if (viewState.lastView && !viewState.processedViews.has(event.view.id)) {
      viewState.processedViews.set(event.view.id, viewState.lastView);
      viewState.lastView = null;
    }

    const view = viewState.processedViews.get(event.view.id);
    event.view.url = view ? view.url : event.view.url;
  }
}
