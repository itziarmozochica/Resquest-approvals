import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { AlertDirectory } from '@fz-original/app/shared/services/alert-directory/alert-directory.model';
import { AlertDirectoryService } from '@fz-original/app/shared/services/alert-directory/alert-directory.service';
import { PartnerAlertSettings } from '@fz-original/app/shared/services/partner-alert-settings/partner-alert-settings.model';
import { PartnerAlertSettingsService } from '@fz-original/app/shared/services/partner-alert-settings/partner-alert-settings.service';
import { SlackChannel } from '@fz-original/app/shared/services/slack-channels/slack-channels.model';
import { SlackChannelsService } from '@fz-original/app/shared/services/slack-channels/slack-channels.service';
import { asapScheduler, Observable, ReplaySubject } from 'rxjs';
import { observeOn, share, tap } from 'rxjs/operators';

import { FeverDirectoryRows } from '../models/fever-directory.model';
import { FeverPmDirectoryService } from './fever-pm-directory.service';

/**
 * Warms and memoizes the directory / Slack / alert-settings reads the {@link AlertConfigFormComponent}
 * makes when it mounts. The alert-config step sits deep in the create wizards, so the containers call
 * {@link prefetch} on the first step: by the time the user reaches the step the responses are cached and
 * the form renders instantly instead of firing these (notably the paginated Fever directory) on arrival.
 *
 * Provide it in each wizard container's `providers` so the cache lifetime matches the wizard — a fresh
 * entry means a fresh fetch, without touching the four `providedIn: 'root'` services for other consumers.
 * `AlertConfigFormComponent` injects it optionally, so hosts that do not provide it fetch directly as before.
 */
@Injectable()
export class AlertConfigPrefetchService {
  readonly #directoryService = inject(AlertDirectoryService);
  readonly #feverPmDirectoryService = inject(FeverPmDirectoryService);
  readonly #slackChannelsService = inject(SlackChannelsService);
  readonly #partnerAlertSettingsService = inject(PartnerAlertSettingsService);

  readonly #directory = new Map<string, Observable<BaseResponse<AlertDirectory | null>>>();
  readonly #feverPm = new Map<string, Observable<FeverDirectoryRows>>();
  readonly #slackChannels = new Map<string, Observable<BaseResponse<SlackChannel[] | null>>>();
  readonly #partnerAlertSettings = new Map<string, Observable<BaseResponse<PartnerAlertSettings | null>>>();

  directory(partnerId: number, projectId: string | null): Observable<BaseResponse<AlertDirectory | null>> {
    const key = `${partnerId}|${projectId ?? ''}`;
    return this.#memoize(this.#directory, key, () =>
      this.#directoryService.get(partnerId, projectId).pipe(
        tap(response => {
          if (response.error != null || !response.data) {
            this.#directory.delete(key);
          }
        }),
      ),
    );
  }

  feverPmDirectoryRows(organizationId: number, partnerId: number): Observable<FeverDirectoryRows> {
    return this.#memoize(this.#feverPm, `${organizationId}|${partnerId}`, () =>
      this.#feverPmDirectoryService.loadDirectoryRows(organizationId, partnerId),
    );
  }

  partnerAlertSettings(partnerId: number): Observable<BaseResponse<PartnerAlertSettings | null>> {
    return this.#memoize(this.#partnerAlertSettings, `${partnerId}`, () => this.#partnerAlertSettingsService.get(partnerId));
  }

  /** Kicks off every fetch so the cache is warm before the alert-config step mounts. */
  prefetch(partnerId: number, projectId: string | null, organizationId: number): void {
    const swallow = { error: (): void => undefined };
    this.directory(partnerId, projectId).subscribe(swallow);
    this.feverPmDirectoryRows(organizationId, partnerId).subscribe(swallow);
    this.slackChannels(partnerId).subscribe(swallow);
    this.partnerAlertSettings(partnerId).subscribe(swallow);
  }

  slackChannels(partnerId: number): Observable<BaseResponse<SlackChannel[] | null>> {
    return this.#memoize(this.#slackChannels, `${partnerId}`, () => this.#slackChannelsService.get(partnerId));
  }

  #memoize<T>(cache: Map<string, Observable<T>>, key: string, source: () => Observable<T>): Observable<T> {
    let stream = cache.get(key);
    if (!stream) {
      // A ReplaySubject(1) connector caches the single response for the late (on-mount) subscriber, kept alive
      // after the prefetch and after the source completes (resetOnRefCountZero/resetOnComplete: false).
      // resetOnError drops it so a prefetch that hit a transient failure re-runs the source on the next read.
      // observeOn keeps a warm replay async, matching the original HTTP timing so the form's on-load emit never
      // runs inside the same change-detection pass.
      stream = source().pipe(
        share({
          resetOnComplete: false,
          resetOnError: true,
          resetOnRefCountZero: false,
          connector: () => new ReplaySubject<T>(1),
        }),
        observeOn(asapScheduler),
      );
      cache.set(key, stream);
    }
    return stream;
  }
}
