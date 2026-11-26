import { formatNumber } from '@angular/common';
import { DestroyRef, inject, Injectable, LOCALE_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { STORAGE_SERVICE } from '@fz/storage';
import { IgntToastRef, IgntToastService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest } from 'rxjs';
import { filter, startWith, take } from 'rxjs/operators';

import { FeatureFlags } from '../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../shared/optimizely/optimizely.service';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { Permissions } from '../../../shared/services/user/permissions';
import { UserService } from '../../../shared/services/user/user.service';
import { FAILURES_PANEL_QUERY_PARAM, FAILURES_PANEL_QUERY_VALUE } from '../models/distributor-group-failures-panel.model';
import { DistributorGroupPublicationStatusEnum } from '../models/distributor-group-publication-status.enum';
import { DistributorGroupPublication } from '../models/distributor-group-publication.model';
import { RecentDistributorGroupPublicationsService } from './recent-distributor-group-publications.service';

@Injectable({
  providedIn: 'root',
})
export class DistributorGroupPublicationToastsService {
  static readonly eventsUrl = '/b2b-publishing/events';
  static readonly readThrottleMs = 30_000;
  static readonly runningRefreshMs = 10_000;
  static readonly salesFlowUrlPatterns: readonly RegExp[] = [
    /^\/box-office(\?|$)/,
    /^\/box-office\/(checkout|order|purchased-cart)\//,
    /^\/kiosk(\/|\?|$)/,
    /^\/reschedule\/order(\/|\?|$)/,
    /^\/reservations\/(multi\/)?(create|create-on-behalf)(\/|\?|$)/,
    /^\/reservations\/checkout\//,
    /^\/reservations\/(list|user-list)\/[^/?]+\/(checkout|modify)(\/|\?|$)/,
    /^\/reservations\/[^/?]+\/order(\/|\?|$)/,
    /^\/reservations\/leads\/[^/?]+\/convert(\/|\?|$)/,
  ];

  readonly #destroyRef = inject(DestroyRef);
  readonly #locale = inject(LOCALE_ID);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #publicationsService = inject(RecentDistributorGroupPublicationsService);
  readonly #router = inject(Router);
  readonly #storage = inject(STORAGE_SERVICE);
  readonly #toastService = inject(IgntToastService);
  readonly #translate = inject(TranslateService);
  readonly #userService = inject(UserService);

  readonly #finishedToasts = new Map<string, { publicationId: string; toast: IgntToastRef }>();
  readonly #runningToasts = new Map<string, IgntToastRef>();
  #isWatching = false;
  #lastReadAt: number | null = null;
  #partnerId: number | null = null;
  #runningRefresh: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.#destroyRef.onDestroy(() => this.#stopRunningRefresh());
  }

  onPublicationStarted(): void {
    for (const groupId of [...this.#finishedToasts.keys()]) {
      this.#closeFinished(groupId);
    }
    this.#read(true);
  }

  onRetryStarted(groupId: string): void {
    this.#closeFinished(groupId);
    this.#read(true);
  }

  watch(): void {
    if (this.#isWatching) {
      return;
    }
    this.#isWatching = true;

    const navigations$ = this.#router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
    );

    combineLatest([
      this.#partnerService.partner$(),
      this.#userService.observePermissions().pipe(startWith(undefined)),
      this.#optimizelyService.observeUserData(),
      navigations$,
    ])
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(([partner]) => this.#onContext(partner?.id ?? null));
  }

  #readAccess(): boolean | null {
    const hasB2bMarketplace = this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.ORGANIZER_B2BM,
      team: 'b2b-resellers',
    });
    const arePermissionsKnown = this.#userService.permissionsInOrganization.length > 0;
    const canViewB2bPublishing = this.#userService.hasPermission(Permissions.CAN_VIEW_B2B_PUBLISHING);

    if (hasB2bMarketplace === false || (arePermissionsKnown && !canViewB2bPublishing)) {
      return false;
    }
    if (hasB2bMarketplace === null || !arePermissionsKnown) {
      return null;
    }
    return true;
  }

  #closeFinished(groupId: string): void {
    const finished = this.#finishedToasts.get(groupId);
    if (finished !== undefined && this.#partnerId !== null) {
      this.#rememberClosed(StorageKey.closedDistributorGroupPublications, this.#partnerId, finished.publicationId);
    }
    this.#dismissFinished(groupId);
  }

  #dismissFinished(groupId: string): void {
    const finished = this.#finishedToasts.get(groupId);
    this.#finishedToasts.delete(groupId);
    finished?.toast.dismiss();
  }

  #dismissRunning(groupId: string): void {
    const toast = this.#runningToasts.get(groupId);
    this.#runningToasts.delete(groupId);
    toast?.dismiss();
  }

  #isSalesFlow(): boolean {
    const url = this.#router.url;
    return DistributorGroupPublicationToastsService.salesFlowUrlPatterns.some(pattern => pattern.test(url));
  }

  #onContext(partnerId: number | null): void {
    if (partnerId !== this.#partnerId) {
      this.#reset();
    }
    this.#partnerId = partnerId;

    const access = this.#readAccess();
    if (access === null) {
      return;
    }
    if (!access) {
      this.#reset();
      return;
    }

    this.#read(false);
  }

  #read(isForced: boolean): void {
    const partnerId = this.#partnerId;
    if (partnerId === null || this.#readAccess() !== true) {
      return;
    }
    if (this.#isSalesFlow()) {
      this.#stopRunningRefresh();
      this.#lastReadAt = null;
      return;
    }

    const now = Date.now();
    if (!isForced && this.#lastReadAt !== null && now - this.#lastReadAt < DistributorGroupPublicationToastsService.readThrottleMs) {
      return;
    }
    this.#lastReadAt = now;

    this.#publicationsService
      .getPartnerPublications(partnerId)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        if (partnerId !== this.#partnerId || response?.error || !response?.data) {
          return;
        }

        this.#show(partnerId, response.data);
      });
  }

  #reset(): void {
    this.#stopRunningRefresh();
    const toasts = [...this.#runningToasts.values(), ...[...this.#finishedToasts.values()].map(({ toast }) => toast)];
    this.#runningToasts.clear();
    this.#finishedToasts.clear();
    this.#lastReadAt = null;
    for (const toast of toasts) {
      toast.dismiss();
    }
  }

  #show(partnerId: number, publications: readonly DistributorGroupPublication[]): void {
    const closedIdsByPartner = this.#idsByPartner(StorageKey.closedDistributorGroupPublications);
    const closedIds = new Set(closedIdsByPartner[partnerId] ?? []);
    const closedRunningIdsByPartner = this.#idsByPartner(StorageKey.closedRunningDistributorGroupPublications);
    const closedRunningIds = new Set(closedRunningIdsByPartner[partnerId] ?? []);
    const runningGroupIds = new Set<string>();
    const keptIds = new Set<string>();
    const keptClosedIds = new Set<string>();

    for (const publication of publications) {
      if (this.#finishedToasts.get(publication.groupId)?.publicationId !== publication.id) {
        this.#dismissFinished(publication.groupId);
      }

      if (publication.status === DistributorGroupPublicationStatusEnum.RUNNING) {
        runningGroupIds.add(publication.groupId);
        if (closedRunningIds.has(publication.id)) {
          keptClosedIds.add(publication.id);
          continue;
        }
        if (!this.#runningToasts.has(publication.groupId)) {
          this.#showRunning(partnerId, publication);
        }
        continue;
      }

      this.#dismissRunning(publication.groupId);
      if (closedIds.has(publication.id)) {
        keptIds.add(publication.id);
        continue;
      }
      if (this.#finishedToasts.get(publication.groupId)?.publicationId !== publication.id) {
        this.#showFinished(partnerId, publication);
      }
    }

    for (const groupId of [...this.#runningToasts.keys()]) {
      if (!runningGroupIds.has(groupId)) {
        this.#dismissRunning(groupId);
      }
    }

    this.#storeIds(StorageKey.closedDistributorGroupPublications, closedIdsByPartner, partnerId, keptIds);
    this.#storeIds(StorageKey.closedRunningDistributorGroupPublications, closedRunningIdsByPartner, partnerId, keptClosedIds);
    this.#refreshWhileRunning(runningGroupIds.size > 0);
  }

  #refreshWhileRunning(isAnyRunning: boolean): void {
    this.#stopRunningRefresh();
    if (!isAnyRunning) {
      return;
    }

    this.#runningRefresh = setTimeout(() => {
      this.#refreshWhileRunning(true);
      this.#read(true);
    }, DistributorGroupPublicationToastsService.runningRefreshMs);
  }

  #stopRunningRefresh(): void {
    if (this.#runningRefresh !== null) {
      clearTimeout(this.#runningRefresh);
      this.#runningRefresh = null;
    }
  }

  #rememberClosed(key: StorageKey, partnerId: number, publicationId: string): void {
    const closedIdsByPartner = this.#idsByPartner(key);
    const closedIds = new Set(closedIdsByPartner[partnerId] ?? []);
    closedIds.add(publicationId);
    this.#storeIds(key, closedIdsByPartner, partnerId, closedIds);
  }

  #storeIds(key: StorageKey, idsByPartner: Record<number, string[]>, partnerId: number, ids: ReadonlySet<string>): void {
    if (ids.size > 0) {
      idsByPartner[partnerId] = [...ids];
    } else {
      delete idsByPartner[partnerId];
    }
    this.#storage.set(key, idsByPartner);
  }

  #showFinished(partnerId: number, publication: DistributorGroupPublication): void {
    const descriptionKey =
      publication.failedCount > 0
        ? 'marketplaceEvents.publications.finished.descriptionWithFailures'
        : 'marketplaceEvents.publications.finished.description';
    const hasFailures = publication.failedCount > 0;
    const toast = this.#toastService.show({
      actionLabel: this.#translate.instant(
        hasFailures ? 'marketplaceEvents.publications.finished.viewFailed' : 'marketplaceEvents.publications.finished.viewInEvents',
      ),
      description: this.#translate.instant(descriptionKey, {
        failed: this.#count(publication.failedCount),
        published: this.#count(publication.publishedCount ?? 0),
        requested: this.#count(publication.requestedCount),
      }),
      duration: Infinity,
      sentiment: publication.failedCount > 0 ? 'warning' : 'positive',
      title: this.#translate.instant('marketplaceEvents.publications.finished.title', { group: publication.groupName }),
    });
    this.#finishedToasts.set(publication.groupId, { publicationId: publication.id, toast });

    toast
      .onAction()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        complete: () => {
          if (this.#finishedToasts.get(publication.groupId)?.toast !== toast) {
            return;
          }

          this.#finishedToasts.delete(publication.groupId);
          this.#rememberClosed(StorageKey.closedDistributorGroupPublications, partnerId, publication.id);
        },
        next: () =>
          void this.#router.navigate([DistributorGroupPublicationToastsService.eventsUrl], {
            queryParams: {
              group: publication.groupId,
              view: 'groups',
              ...(hasFailures ? { [FAILURES_PANEL_QUERY_PARAM]: FAILURES_PANEL_QUERY_VALUE } : {}),
            },
          }),
      });
  }

  #count(value: number): string {
    return formatNumber(value, this.#locale, '1.0-0');
  }

  #idsByPartner(key: StorageKey): Record<number, string[]> {
    const stored = this.#storage.get<Record<number, unknown>>(key);
    if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) {
      return {};
    }

    const byPartner: Record<number, string[]> = {};
    for (const [partnerId, ids] of Object.entries(stored)) {
      if (Array.isArray(ids)) {
        byPartner[Number(partnerId)] = ids.filter((id): id is string => typeof id === 'string');
      }
    }
    return byPartner;
  }

  #showRunning(partnerId: number, publication: DistributorGroupPublication): void {
    const descriptionKey =
      publication.runRequestedCount === 1
        ? 'marketplaceEvents.publications.running.goingOnSaleOne'
        : 'marketplaceEvents.publications.running.goingOnSaleMany';
    const toast = this.#toastService.show({
      description: this.#translate.instant(descriptionKey, { count: this.#count(publication.runRequestedCount) }),
      duration: Infinity,
      sentiment: 'info',
      title: this.#translate.instant('marketplaceEvents.publications.running.title', { group: publication.groupName }),
    });
    this.#runningToasts.set(publication.groupId, toast);

    toast
      .onAction()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        complete: () => {
          if (this.#runningToasts.get(publication.groupId) !== toast) {
            return;
          }

          this.#runningToasts.delete(publication.groupId);
          this.#rememberClosed(StorageKey.closedRunningDistributorGroupPublications, partnerId, publication.id);
        },
      });
  }
}
