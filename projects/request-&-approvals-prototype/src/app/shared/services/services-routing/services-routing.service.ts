import { inject, Injectable } from '@angular/core';

import { datadogRum } from '@datadog/browser-rum-slim';
import { STORAGE_SERVICE, StoragePort } from '@fz/storage';
import * as Sentry from '@sentry/angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MessageType, WebviewMessengerService } from '../webview-messenger/webview-messenger.service';

export interface ServicesRoutingMessageContent {
  servicesBaseUrl: string | null;
  proxyBaseUrl?: string;
  shouldRouteThroughProxy?: boolean;
}

interface PersistedRoutingState {
  servicesBaseUrl: string | null;
  version: number;
}

const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '::1']);
const ROUTING_STORAGE_KEY = 'feverzone.routing_state';
const ROUTING_SCHEMA_VERSION = 1;

type RoutingTargetResolution = { kind: 'accepted'; url: string } | { kind: 'rejected-non-loopback' } | { kind: 'rejected' };

const resolveRoutingTarget = (rawValue: unknown): RoutingTargetResolution => {
  if (typeof rawValue !== 'string') {
    return { kind: 'rejected' };
  }
  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    return { kind: 'rejected' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { kind: 'rejected' };
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!LOOPBACK_HOSTNAMES.has(hostname)) {
    return { kind: 'rejected-non-loopback' };
  }
  return { kind: 'accepted', url: rawValue };
};

@Injectable({
  providedIn: 'root',
})
export class ServicesRoutingService {
  readonly #storage: StoragePort = inject(STORAGE_SERVICE);
  readonly #webviewMessenger: WebviewMessengerService = inject(WebviewMessengerService);
  readonly #servicesBaseUrl = new BehaviorSubject<string | null>(this.#loadFromStorage());
  readonly servicesBaseUrl$: Observable<string | null> = this.#servicesBaseUrl.asObservable();

  constructor() {
    this.#emitObservability(this.#servicesBaseUrl.value);
    this.#webviewMessenger
      .observe<unknown>(MessageType.ServicesRouting)
      .pipe(
        catchError((error, source$) => {
          Sentry.captureException(error);
          return source$;
        }),
      )
      .subscribe(content => {
        try {
          this.#applyRouting(content);
        } catch (error) {
          Sentry.captureException(error);
        }
      });
  }

  getSnapshot(): string | null {
    return this.#servicesBaseUrl.value;
  }

  #applyRouting(content: unknown): void {
    if (content === null || typeof content !== 'object' || Array.isArray(content)) {
      return;
    }
    const rawServicesBaseUrl = (content as ServicesRoutingMessageContent).servicesBaseUrl;
    const resolution = resolveRoutingTarget(rawServicesBaseUrl);
    if (resolution.kind === 'rejected-non-loopback') {
      Sentry.captureMessage('Rejected non-loopback servicesBaseUrl routing target', {
        extra: { rawServicesBaseUrl },
        level: 'warning',
      });
    }
    const servicesBaseUrl = resolution.kind === 'accepted' ? resolution.url : null;
    if (servicesBaseUrl === this.#servicesBaseUrl.value) {
      return;
    }
    this.#servicesBaseUrl.next(servicesBaseUrl);
    this.#persistToStorage(servicesBaseUrl);
    this.#emitObservability(servicesBaseUrl);
  }

  #emitObservability(servicesBaseUrl: string | null): void {
    const mode = servicesBaseUrl !== null ? 'proxy' : 'direct';
    Sentry.setTag('proxy.mode', mode);
    Sentry.addBreadcrumb({
      category: 'proxy',
      data: { mode, servicesBaseUrl },
      level: 'info',
      message: 'Services routing mode',
    });
    datadogRum.setGlobalContextProperty('proxy.enabled', servicesBaseUrl !== null);
  }

  #loadFromStorage(): string | null {
    const parsed = this.#storage.get<PersistedRoutingState>(ROUTING_STORAGE_KEY);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.version !== ROUTING_SCHEMA_VERSION) {
      return null;
    }
    const resolution = resolveRoutingTarget(parsed.servicesBaseUrl);
    return resolution.kind === 'accepted' ? resolution.url : null;
  }

  #persistToStorage(servicesBaseUrl: string | null): void {
    const payload: PersistedRoutingState = { servicesBaseUrl, version: ROUTING_SCHEMA_VERSION };
    this.#storage.set<PersistedRoutingState>(ROUTING_STORAGE_KEY, payload);
  }
}
