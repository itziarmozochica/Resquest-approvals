import { inject, Injectable } from '@angular/core';

import { PlanGallery, PlanMedia } from '@fz-original/app/modules/content-plan/models/get-gallery';
import { PlanMediaDTO } from '@fz-original/app/modules/content-plan/models/patch-gallery';
import { PlanContentService } from '@fz-original/app/modules/content-plan/services/plan-content/plan-content.service';
import { PlanGalleryService } from '@fz-original/app/modules/content-plan/services/plan-gallery/plan-gallery.service';
import { VenueService } from '@fz-original/app/modules/content-plan/services/venue/venue.service';
import { PlanCategory } from '@fz-original/app/modules/event-settings/models/general-section.enum';
import { MainPlanSettingsService } from '@fz-original/app/modules/event-settings/services/main-plan-settings.service';
import { Venue } from '@fz-original/app/shared/models/plan/plan-detail.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import {
  CreateMainPlanMediaItem,
  CreateMainPlanPayload,
  CreateMainPlanService,
} from '../../../../../../shared/services/plan/create-main-plan.service';
import { QuickSetupFormValues } from '../models/quick-setup-form.model';
import { QuickSetupWriteOriginService } from './quick-setup-write-origin.service';

export interface QuickSetupCreateResult {
  planId: number;
}

@Injectable({
  providedIn: 'root',
})
export class CreateEventQuickSetupService {
  readonly #createMainPlanService = inject(CreateMainPlanService);
  readonly #mainPlanSettingsService = inject(MainPlanSettingsService);
  readonly #partnerService = inject(PartnerService);
  readonly #planContentService = inject(PlanContentService);
  readonly #planGalleryService = inject(PlanGalleryService);
  readonly #venueService = inject(VenueService);
  readonly #writeOriginService = inject(QuickSetupWriteOriginService);

  createQuickSetupPlan(values: QuickSetupFormValues): Observable<QuickSetupCreateResult | null> {
    const partnerId = this.#partnerService.getPartner()?.id;

    if (!partnerId) {
      return of(null);
    }

    const payload: CreateMainPlanPayload = {
      category: values.category,
      description: values.description,
      media: values.galleryMedia,
      place_id: values.venueId,
      plan_type: values.eventType,
      title: values.title,
      ...(values.informationRequestId ? { information_request_id: values.informationRequestId } : {}),
    };

    return this.#createMainPlanService.createMainPlan(partnerId, payload, this.#writeOriginService.context()).pipe(
      map(response => {
        const planId = response.data?.plan_id;

        if (!planId) {
          return null;
        }

        return { planId };
      }),
    );
  }

  updateQuickSetupPlan(planId: number, values: QuickSetupFormValues, venue: Venue): Observable<QuickSetupCreateResult | null> {
    const partnerId = this.#partnerService.getPartner()?.id;

    if (!partnerId) {
      return of(null);
    }

    return forkJoin({
      category: this.#mainPlanSettingsService.updateMainPlanGeneralSettings(partnerId, planId, {
        // QuickSetupCategoryId is fever2's active Category set; settings still type the stale PlanCategory enum.
        category: values.category as PlanCategory,
      }),
      content: this.#planContentService.updatePlanContent(partnerId, planId, {
        description: values.description,
        name: values.title,
      }),
      gallery: this.#updateGallery(partnerId, planId, values.galleryMedia),
      venue: this.#venueService.updateVenue(partnerId, planId, [venue]),
    }).pipe(
      map(() => ({ planId })),
      catchError(() => of(null)),
    );
  }

  #mapGalleryMediaForCreate(media: CreateMainPlanMediaItem[]): PlanMediaDTO[] {
    return media.map(item => this.#mapNewGalleryMediaItem(item));
  }

  #mapGalleryMediaForUpdate(media: CreateMainPlanMediaItem[], existingMedia: PlanMedia[]): PlanMediaDTO[] {
    return media.map(item => {
      const existingItem = existingMedia.find(current => current.url === item.url);

      if (existingItem !== undefined) {
        return { id: existingItem.id };
      }

      return this.#mapNewGalleryMediaItem(item);
    });
  }

  #mapNewGalleryMediaItem(item: CreateMainPlanMediaItem): PlanMediaDTO {
    return {
      name: item.name,
      url: item.url,
      ...(item.poster !== undefined ? { poster: item.poster } : {}),
      ...(item.playback_rate !== undefined ? { playback_rate: String(item.playback_rate) } : {}),
    };
  }

  #saveGallery(partnerId: number, planId: number, media: CreateMainPlanMediaItem[], gallery: PlanGallery | null): Observable<void> {
    if (gallery?.id != null) {
      return this.#planGalleryService.updateGallery(partnerId, planId, gallery.id, {
        photos: this.#mapGalleryMediaForUpdate(media, gallery.media ?? []),
      });
    }

    if (media.length === 0) {
      return of(undefined);
    }

    return this.#planGalleryService.createGallery(partnerId, planId, {
      media: this.#mapGalleryMediaForCreate(media),
    });
  }

  #updateGallery(partnerId: number, planId: number, media: CreateMainPlanMediaItem[]): Observable<void> {
    return this.#planGalleryService
      .getGalleryOrNull(partnerId, planId)
      .pipe(switchMap(gallery => this.#saveGallery(partnerId, planId, media, gallery)));
  }
}
