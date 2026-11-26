import { Injectable } from '@angular/core';

import {
  ChannelOverrideDTO,
  ChannelOverrideSetting,
  SessionTypeChannelOverride,
} from '@fz-original/app/shared/services/sessions/session-type.model';

type OverriddenSetting<T> = Exclude<ChannelOverrideSetting<T>, { kind: 'inherit' }>;

@Injectable({
  providedIn: 'root',
})
export class ChannelOverrideAdapter {
  fromApi(channelOverrides: ChannelOverrideDTO[]): SessionTypeChannelOverride[] {
    return channelOverrides.map((channelOverride: ChannelOverrideDTO) => this.#mapChannelOverrideDTO(channelOverride));
  }

  toApi(channelOverrides: SessionTypeChannelOverride[]): ChannelOverrideDTO[] {
    return channelOverrides.map(channelOverride => this.#mapChannelOverride(channelOverride));
  }

  #mapChannelOverride(channelOverride: SessionTypeChannelOverride): ChannelOverrideDTO {
    const dto: ChannelOverrideDTO = { channel_id: channelOverride.channelId };

    if (channelOverride.displayStep.kind !== 'inherit') {
      dto.display_step = this.#overriddenValue(channelOverride.displayStep);
    }

    if (channelOverride.selectorType.kind !== 'inherit') {
      dto.selector_type = this.#overriddenValue(channelOverride.selectorType);
    }

    if (channelOverride.isSelectedByDefault.kind !== 'inherit') {
      dto.is_selected_by_default = this.#overriddenValue(channelOverride.isSelectedByDefault);
    }

    if (channelOverride.errorMessageKey.kind !== 'inherit') {
      dto.error_message_key = this.#overriddenValue(channelOverride.errorMessageKey);
    }

    if (channelOverride.visibleOnlyWhenNeededSessionTypesSelected.kind !== 'inherit') {
      dto.visible_only_when_needed_session_types_selected = this.#overriddenValue(
        channelOverride.visibleOnlyWhenNeededSessionTypesSelected,
      );
    }

    return dto;
  }

  #mapChannelOverrideDTO(dto: ChannelOverrideDTO): SessionTypeChannelOverride {
    return {
      channelId: dto.channel_id,
      displayStep: this.#settingFromApi(dto.display_step),
      errorMessageKey: this.#settingFromApi(dto.error_message_key),
      isSelectedByDefault: this.#settingFromApi(dto.is_selected_by_default),
      selectorType: this.#settingFromApi(dto.selector_type),
      visibleOnlyWhenNeededSessionTypesSelected: this.#settingFromApi(dto.visible_only_when_needed_session_types_selected),
    };
  }

  #settingFromApi<T>(value: T | null | undefined): ChannelOverrideSetting<T> {
    if (value === undefined) {
      return { kind: 'inherit' };
    }
    if (value === null) {
      return { kind: 'overrideToEmpty' };
    }
    return { kind: 'overrideToValue', value };
  }

  #overriddenValue<T>(setting: OverriddenSetting<T>): T | null {
    return setting.kind === 'overrideToEmpty' ? null : setting.value;
  }
}
