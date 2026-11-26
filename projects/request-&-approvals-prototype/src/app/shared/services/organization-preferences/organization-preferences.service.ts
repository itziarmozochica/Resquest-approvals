import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntToastService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { Organization, OrganizationData } from '../../models/organization/organization.model';

interface FavoriteChange {
  isFavorite: boolean;
  organization: Organization;
  settledBeforeLoad: number | null;
}

interface OrganizationPreferencesData {
  favorite_organizations: OrganizationData[];
  recent_organizations: OrganizationData[];
}

@Injectable({ providedIn: 'root' })
export class OrganizationPreferencesService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #favoriteChanges = new Map<number, FavoriteChange>();
  readonly #favoriteOrganizations = signal<Organization[]>([]);
  readonly #http = inject(HttpClient);
  readonly #loaded = signal(false);
  #loadCount = 0;
  readonly #loading = signal(false);
  #loadSubscription: Subscription | null = null;
  readonly #pendingFavoriteIds = signal<ReadonlySet<number>>(new Set());
  readonly #recentOrganizations = signal<Organization[]>([]);
  #session = 0;
  readonly #toastService = inject(IgntToastService);
  readonly #translate = inject(TranslateService);
  readonly favoriteOrganizationIds = computed(() => new Set(this.#favoriteOrganizations().map(organization => organization.id)));
  readonly favoriteOrganizations = this.#favoriteOrganizations.asReadonly();
  readonly loaded = this.#loaded.asReadonly();
  readonly loading = this.#loading.asReadonly();
  readonly pendingFavoriteIds = this.#pendingFavoriteIds.asReadonly();
  readonly recentOrganizations = this.#recentOrganizations.asReadonly();

  clear(): void {
    this.#session += 1;
    this.#loadSubscription?.unsubscribe();
    this.#loadSubscription = null;
    this.#favoriteChanges.clear();
    this.#pendingFavoriteIds.set(new Set());
    this.#favoriteOrganizations.set([]);
    this.#recentOrganizations.set([]);
    this.#loaded.set(false);
    this.#loading.set(false);
  }

  ensureLoaded(): void {
    if (!this.#loaded() && !this.#loading()) {
      this.load();
    }
  }

  load(): void {
    this.#loadSubscription?.unsubscribe();
    this.#loadCount += 1;
    this.#favoriteChanges.forEach((change, organizationId) => {
      if (change.settledBeforeLoad !== null && change.settledBeforeLoad <= this.#loadCount) {
        this.#favoriteChanges.delete(organizationId);
      }
    });
    this.#favoriteOrganizations.set([]);
    this.#recentOrganizations.set([]);
    this.#loaded.set(false);
    this.#loading.set(true);
    this.#loadSubscription = this.#http
      .get<BaseResponse<OrganizationPreferencesData>>(`${environment.apiIamBaseUrl}/1.0/users/me/organization-preferences`, {
        params: { operating_platform: 'feverzone' },
      })
      .pipe(
        finalize(() => this.#loading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => undefined,
        next: response => {
          this.#favoriteOrganizations.set((response.data?.favorite_organizations ?? []).map(toOrganization));
          this.#favoriteChanges.forEach(({ isFavorite, organization }) => this.#applyFavorite(organization, isFavorite));
          this.#recentOrganizations.set((response.data?.recent_organizations ?? []).map(toOrganization));
          this.#loaded.set(true);
        },
      });
  }

  recordVisit(organizationId: number): void {
    this.#http
      .put<void>(this.#url('recent-organizations', organizationId), null)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({ error: () => undefined });
  }

  toggleFavorite(organization: Organization): void {
    if (this.#pendingFavoriteIds().has(organization.id)) {
      return;
    }
    const wasFavorite = this.favoriteOrganizationIds().has(organization.id);
    this.#setPending(organization.id, true);
    this.#changeFavorite(organization, !wasFavorite);
    const url = this.#url('favorite-organizations', organization.id);
    const request$ = wasFavorite ? this.#http.delete<void>(url) : this.#http.put<void>(url, null);
    const session = this.#session;
    request$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: () => {
        if (session !== this.#session) {
          return;
        }
        this.#changeFavorite(organization, wasFavorite);
        this.#settle(organization.id);
        this.#toastService.danger(this.#translate.instant('selectOrganization.favoriteError'));
      },
      next: () => {
        if (session === this.#session) {
          this.#settle(organization.id);
        }
      },
    });
  }

  #applyFavorite(organization: Organization, isFavorite: boolean): void {
    this.#favoriteOrganizations.update(favorites => {
      const others = favorites.filter(favorite => favorite.id !== organization.id);
      return isFavorite ? [...others, organization].sort((a, b) => a.name.localeCompare(b.name)) : others;
    });
  }

  #changeFavorite(organization: Organization, isFavorite: boolean): void {
    this.#favoriteChanges.set(organization.id, { isFavorite, organization, settledBeforeLoad: null });
    this.#applyFavorite(organization, isFavorite);
  }

  #setPending(organizationId: number, isPending: boolean): void {
    this.#pendingFavoriteIds.update(pending => {
      const next = new Set(pending);
      if (isPending) {
        next.add(organizationId);
      } else {
        next.delete(organizationId);
      }
      return next;
    });
  }

  #settle(organizationId: number): void {
    const change = this.#favoriteChanges.get(organizationId);
    if (change !== undefined) {
      this.#favoriteChanges.set(organizationId, { ...change, settledBeforeLoad: this.#loadCount + 1 });
    }
    this.#setPending(organizationId, false);
  }

  #url(collection: 'favorite-organizations' | 'recent-organizations', organizationId: number): string {
    return `${environment.apiIamBaseUrl}/1.0/users/me/${collection}/${organizationId}`;
  }
}

function toOrganization(organization: OrganizationData): Organization {
  return new Organization(
    organization.id,
    organization.name,
    organization.country_code,
    organization.city_code,
    organization.type,
    organization.deleted_at,
    null,
    organization.category,
  );
}
