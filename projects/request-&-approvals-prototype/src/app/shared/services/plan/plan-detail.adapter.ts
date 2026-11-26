import { inject, Injectable } from '@angular/core';

import { SanitizeService } from '@fz-original/app/app/services/sanitize/sanitize.service';

import { AdapterInterface } from '../../../core/adapter.interface';
import { Block } from '../../../modules/content-plan/components/plan-edition/description-builder/models/block.model';
import { ContentSchemaAdapter } from '../../../modules/content-plan/services/content-schema/content-schema.adapter';
import {
  ExplodePipeOption,
  SelectorSettingType,
  SessionSelectorType,
} from '../../../modules/event-settings/models/selector-session-section.enum';
import { Channel, ChannelDTO } from '../../models/channel/channel.model';
import { PlanDetail, PlanDetailDTO } from '../../models/plan/plan-detail.model';
import { PlanKind } from '../../models/plan/plan-kind.enum';
import { PlanStatus } from '../../models/plan/plan-status.enum';

@Injectable({
  providedIn: 'root',
})
export class PlanDetailAdapter implements AdapterInterface<PlanDetail> {
  #sanitizeService: SanitizeService = inject(SanitizeService);
  readonly #contentSchemaAdapter = inject(ContentSchemaAdapter);

  fromApi(data: PlanDetailDTO): PlanDetail {
    const planDetail = new PlanDetail(
      data.id,
      data.name,
      this.#sanitizeService.sanitizeToString((data.description as string) ? data.description : null) ?? '',
      data.is_waitlist,
      data.venues,
      data.gallery,
      this.getChannels(data.channels),
      data.status as PlanStatus,
      data.absolute_url,
      data.hidden_feed,
      data.default_capacity_per_time_slot,
      data.translation_languages,
      data.has_adaptive_pricing,
      data.is_eligible_for_redirect,
      data.partner_id,
      data.short_description,
      data.base_locale,
      data.label_format,
      undefined,
      data.type,
      data.type === PlanKind.PRIZE_DRAW,
      data.type === PlanKind.AUCTION,
      data.session_selector_type as SessionSelectorType | undefined,
      data.selector_label_explode_pipe,
      (data.label_explode_pipe_option ?? undefined) as ExplodePipeOption | undefined,
      data.published_at ? new Date(data.published_at) : null,
      this.#getContentSchemaStructure(data.content_schema),
      data.has_components_description ?? false,
    );

    if (data.catalog_main_plan_id != null) {
      planDetail.catalogMainPlanId = data.catalog_main_plan_id;
    }

    if (data.calendar_selector != null) {
      planDetail.calendarSelector = data.calendar_selector;
    }

    if (data.selector_setting_type != null) {
      planDetail.selectorSettingType = data.selector_setting_type as SelectorSettingType;
    }

    if (data.showcase_venue != null) {
      planDetail.showcaseVenue = data.showcase_venue;
    }

    if (data.has_declarative_inventory != null) {
      planDetail.hasDeclarativeInventory = data.has_declarative_inventory;
    }

    planDetail.isCandlelight = data.is_candlelight ?? false;
    planDetail.providerName = data.provider_name ?? null;

    if (data.queue_overview_channel_ids != null) {
      planDetail.queueOverviewChannelIds = data.queue_overview_channel_ids;
    }

    return planDetail;
  }

  #getContentSchemaStructure(contentSchema: PlanDetailDTO['content_schema']): Block[] {
    if (contentSchema === undefined || contentSchema === null) {
      return [];
    }
    return this.#contentSchemaAdapter.fromApi(contentSchema.structure);
  }

  private getChannels(channels: Array<ChannelDTO>): Array<Channel> {
    return channels.map(channelData => new Channel(channelData.id, channelData.name));
  }
}
