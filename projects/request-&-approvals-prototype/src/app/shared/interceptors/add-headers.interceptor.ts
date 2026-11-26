import { HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import packageJson from '../../../../package.json';
import { environment } from '../../../environments/environment';
import { AuthenticationService } from '../../core/authentication/authentication.service';
import { CUSTOM_HEADERS } from './custom-headers';
import { isExternalRequestUrl } from './is-external-request.util';
import { SKIP_SESSION_AUTHORIZATION } from './skip-session-authorization.token';

@Injectable({
  providedIn: 'root',
})
export class AddHeadersInterceptor implements HttpInterceptor {
  private static readonly APPLICATION_ID_ALLOWLIST = [
    environment.apiIamBaseUrl,
    environment.apiBaseUrl,
    environment.apiGWBaseUrl,
    environment.accessControlApiBaseUrl,
  ];

  constructor(
    public authenticationService: AuthenticationService,
    public translateService: TranslateService,
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isExternalRequest(request.url)) {
      return next.handle(request);
    }

    // Only the headers the @fz/b2b-iam client sets for itself are skipped when already present:
    // appending would send them twice and trip the service's MIN_VERSION_REQUIREMENT. Accept-Language
    // keeps appending, because callers that set their own rely on the app language arriving as a
    // negotiation fallback behind it.
    let headers: HttpHeaders = this.#appendMissing(request.headers, CUSTOM_HEADERS.clientVersion, 'w.' + packageJson.version);
    headers = headers.append('Accept-Language', this.translateService.currentLang);

    if (this.shouldSendApplicationId(request.url)) {
      headers = this.#appendMissing(headers, CUSTOM_HEADERS.applicationId, environment.feverzoneApplicationId);
    }

    if (this.authenticationService.hasApiKey()) {
      headers = this.#appendMissing(headers, CUSTOM_HEADERS.apiKey, this.authenticationService.getApiKey() ?? '');
    } else if (this.authenticationService.isLoggedIn() && !request.context.get(SKIP_SESSION_AUTHORIZATION)) {
      headers = this.#appendMissing(headers, CUSTOM_HEADERS.authorization, this.getAuthorization());
    }
    const clonedRequest = request.clone({ headers });

    return next.handle(clonedRequest);
  }

  isExternalRequest(url: string): boolean {
    return isExternalRequestUrl(url);
  }

  shouldSendApplicationId(url: string): boolean {
    return AddHeadersInterceptor.APPLICATION_ID_ALLOWLIST.some(
      allowedBaseUrl => url === allowedBaseUrl || url.startsWith(`${allowedBaseUrl}/`),
    );
  }

  #appendMissing(headers: HttpHeaders, name: string, value: string): HttpHeaders {
    return headers.has(name) ? headers : headers.append(name, value);
  }

  private getAuthorization(): string {
    const tokenType = 'B2bToken';
    return tokenType + ' ' + this.authenticationService.getToken();
  }
}
