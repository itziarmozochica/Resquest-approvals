import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  signal,
  Signal,
  untracked,
  WritableSignal,
} from '@angular/core';

import { PartnerChannel } from '@fz-original/app/modules/content-plan/models/partner-channels.model';
import { PlanSessionType } from '@fz-original/app/modules/content-plan/models/plan-session-types.model';
import { PlanTranslation } from '@fz-original/app/modules/content-plan/models/plan-translation.model';
import { SessionTypeTranslation } from '@fz-original/app/modules/content-plan/models/session-type-translation.model';
import {
  DescriptionComponentCountsResolver,
  descriptionComponentScopeKey,
  isChannelTranslationComplete,
} from '@fz-original/app/modules/content-plan/utils/channel-translation-completeness.util';
import {
  computeDefaultTranslationFieldCounts,
  DescriptionComponentCounts,
} from '@fz-original/app/modules/content-plan/utils/default-translation-field-count.util';
import { planTranslationLanguageKey } from '@fz-original/app/modules/content-plan/utils/plan-translation-locale.util';
import { AvailableLanguage } from '@fz-original/app/shared/translations/models/available-language.model';
import { IgntAlertComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

export const ALL_CHANNELS_ID = '__all_channels__';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntIconComponent,
    IgntListItemComponent,
    IgntTagComponent,
    IgntWrapperCardComponent,
    TranslateModule,
  ],
  selector: 'app-translation-channels',
  standalone: true,
  styleUrl: './translation-channels.component.scss',
  templateUrl: './translation-channels.component.html',
})
export class TranslationChannelsComponent {
  readonly ALL_CHANNELS_ID = ALL_CHANNELS_ID;
  readonly activeChannels: InputSignal<readonly string[]> = input<readonly string[]>([]);
  readonly availableChannels: InputSignal<readonly PartnerChannel[]> = input<readonly PartnerChannel[]>([]);
  readonly availableLanguages: InputSignal<readonly AvailableLanguage[]> = input<readonly AvailableLanguage[]>([]);
  readonly canEditDefaultTranslations: InputSignal<boolean> = input<boolean>(false);
  readonly canManageChannelTranslations: InputSignal<boolean> = input<boolean>(false);
  readonly descriptionComponentCountsByScope: InputSignal<ReadonlyMap<string, DescriptionComponentCounts>> = input<
    ReadonlyMap<string, DescriptionComponentCounts>
  >(new Map());
  readonly hasComponentsDescription: InputSignal<boolean> = input<boolean>(false);
  readonly planOriginalLabelFormat: InputSignal<string> = input<string>('');
  readonly planOriginalShortDescription: InputSignal<string> = input<string>('');
  readonly planSessionTypes: InputSignal<readonly PlanSessionType[]> = input<readonly PlanSessionType[]>([]);
  readonly selectedChannelIdExternal: InputSignal<string | null> = input<string | null>(null);
  readonly selectedLanguageCode: InputSignal<string> = input<string>('');
  readonly selectedLanguageIsDefault: InputSignal<boolean> = input<boolean>(false);
  readonly sessionTypeTranslationsByEntityId: InputSignal<ReadonlyMap<number, readonly SessionTypeTranslation[]>> = input<
    ReadonlyMap<number, readonly SessionTypeTranslation[]>
  >(new Map());
  readonly translations: InputSignal<readonly PlanTranslation[]> = input<readonly PlanTranslation[]>([]);

  readonly channelSelected: OutputEmitterRef<string | null> = output<string | null>();
  readonly editChannelsClick: OutputEmitterRef<void> = output<void>();

  readonly selectedChannelId: WritableSignal<string> = signal<string>(ALL_CHANNELS_ID);
  readonly showFilterDropdown: WritableSignal<boolean> = signal<boolean>(false);
  readonly visibleAll: WritableSignal<boolean> = signal<boolean>(true);
  readonly #previousChannelIdsSnapshot: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set());
  readonly #visibleChannelFilterBootstrapped: WritableSignal<boolean> = signal<boolean>(false);
  readonly #visibleChannelIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set());

  readonly #descriptionComponentCountsFor: DescriptionComponentCountsResolver = (channelId: string | null, language: string) => {
    if (!this.hasComponentsDescription()) {
      return null;
    }
    return (
      this.descriptionComponentCountsByScope().get(descriptionComponentScopeKey(channelId, planTranslationLanguageKey(language))) ?? null
    );
  };

  readonly channelIds: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const allowedIds = new Set<string>(this.availableChannels().map((channel: PartnerChannel) => channel.id));
    const active = this.activeChannels().filter((id: string) => allowedIds.has(id));
    if (active.length > 0) {
      return [...new Set(active)].sort();
    }
    const fromTranslations = this.translations()
      .map((translation: PlanTranslation) => translation.channelId)
      .filter((id: string | null): id is string => id !== null && allowedIds.has(id));
    return [...new Set(fromTranslations)].sort();
  });

  readonly channelHasCompleteTranslationsById: Signal<ReadonlyMap<string, boolean>> = computed<ReadonlyMap<string, boolean>>(() => {
    const map = new Map<string, boolean>();
    for (const id of this.channelIds()) {
      map.set(id, this.hasChannelTranslations(id));
    }
    return map;
  });

  readonly hasAllChannels: Signal<boolean> = computed<boolean>(() =>
    this.translations().some((translation: PlanTranslation) => translation.channelId === null),
  );

  readonly filteredChannelIds: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const visible = this.#visibleChannelIds();
    return this.channelIds().filter((id: string) => visible.has(id));
  });

  readonly hasActiveFilter: Signal<boolean> = computed<boolean>(() => {
    const visible = this.#visibleChannelIds();
    const allChannelsHidden = this.hasAllChannels() && !this.visibleAll();
    const someChannelHidden = this.channelIds().some((id: string) => !visible.has(id));
    return allChannelsHidden || someChannelHidden;
  });

  readonly isAllChannelsRowComplete: Signal<boolean> = computed<boolean>(() => {
    if (!this.hasAllChannels()) {
      return false;
    }
    if (!this.canEditDefaultTranslations()) {
      return true;
    }
    if (this.selectedLanguageIsDefault() || this.selectedLanguageCode() === '') {
      return this.hasChannelTranslations(null);
    }
    const counts = computeDefaultTranslationFieldCounts({
      channelId: null,
      descriptionComponentCounts: this.#descriptionComponentCountsFor(null, this.selectedLanguageCode()),
      hasComponentsDescription: this.hasComponentsDescription(),
      language: this.selectedLanguageCode(),
      originalLabelFormat: this.planOriginalLabelFormat(),
      originalShortDescription: this.planOriginalShortDescription(),
      planSessionTypes: this.planSessionTypes(),
      planTranslations: this.translations(),
      sessionTypeTranslationsByEntityId: this.sessionTypeTranslationsByEntityId(),
    });
    if (counts.totalFieldCount <= 0) {
      return true;
    }
    return counts.isScopeTranslationComplete;
  });

  readonly hasAnyMissingChannelTranslations: Signal<boolean> = computed<boolean>(() => {
    if (this.selectedLanguageCode() === '') {
      return false;
    }
    if (this.hasAllChannels() && !this.isAllChannelsRowComplete()) {
      return true;
    }
    return this.channelIds().some((id: string) => !this.hasChannelTranslations(id));
  });

  readonly visibleChannelCount: Signal<number> = computed<number>(
    () => (this.visibleAll() && this.hasAllChannels() ? 1 : 0) + this.filteredChannelIds().length,
  );

  constructor() {
    effect(() => {
      const ids = new Set<string>(this.channelIds());
      const current = untracked(() => this.#visibleChannelIds());
      const bootstrapped = untracked(() => this.#visibleChannelFilterBootstrapped());
      const previousIds = untracked(() => this.#previousChannelIdsSnapshot());
      const allChannelsVisible = this.visibleAll();

      if (!bootstrapped) {
        this.#visibleChannelIds.set(ids);
        this.#visibleChannelFilterBootstrapped.set(true);
        this.#previousChannelIdsSnapshot.set(ids);
        return;
      }

      const next = new Set<string>(current);
      let changed = false;
      for (const id of current) {
        if (!ids.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      if (allChannelsVisible) {
        ids.forEach((id: string) => {
          if (!next.has(id) && !previousIds.has(id)) {
            next.add(id);
            changed = true;
          }
        });
      }
      if (changed) {
        this.#visibleChannelIds.set(next);
      }
      if (allChannelsVisible) {
        this.#previousChannelIdsSnapshot.set(ids);
      } else {
        const prunedPreviousSnapshot = new Set<string>();
        for (const id of previousIds) {
          if (ids.has(id)) {
            prunedPreviousSnapshot.add(id);
          }
        }
        this.#previousChannelIdsSnapshot.set(prunedPreviousSnapshot);
      }
    });

    effect(() => {
      const external = this.selectedChannelIdExternal();
      this.selectedChannelId.set(external === null ? ALL_CHANNELS_ID : external);
    });
  }

  clearAll(): void {
    this.#visibleChannelFilterBootstrapped.set(true);
    this.#visibleChannelIds.set(new Set<string>());
    this.visibleAll.set(false);
  }

  getChannelName(channelId: string): string {
    const channel = this.availableChannels().find(({ id }) => id === channelId);
    return channel?.name ?? channelId;
  }

  hasChannelTranslations(channelId: string | null): boolean {
    return isChannelTranslationComplete({
      availableLanguages: this.availableLanguages(),
      channelId,
      descriptionComponentCountsFor: this.#descriptionComponentCountsFor,
      hasComponentsDescription: this.hasComponentsDescription(),
      languageCode: this.#languageCodeForCompleteness(),
      originalLabelFormat: this.planOriginalLabelFormat(),
      originalShortDescription: this.planOriginalShortDescription(),
      planSessionTypes: this.planSessionTypes(),
      sessionTypeTranslationsByEntityId: this.sessionTypeTranslationsByEntityId(),
      translations: this.translations(),
    });
  }

  isChannelVisible(id: string): boolean {
    return this.#visibleChannelIds().has(id);
  }

  onEditChannelsClick(): void {
    this.editChannelsClick.emit();
  }

  selectAll(): void {
    this.#visibleChannelIds.set(new Set<string>(this.channelIds()));
    this.visibleAll.set(true);
  }

  selectChannel(id: string): void {
    this.selectedChannelId.set(id);
    this.channelSelected.emit(id === ALL_CHANNELS_ID ? null : id);
  }

  toggleAllChannelVisibility(): void {
    this.visibleAll.update((value: boolean) => !value);
  }

  toggleChannel(id: string): void {
    const next = new Set<string>(this.#visibleChannelIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.#visibleChannelIds.set(next);
  }

  toggleDropdown(): void {
    this.showFilterDropdown.update((value: boolean) => !value);
  }

  #languageCodeForCompleteness(): string | undefined {
    const code = this.selectedLanguageCode().trim();
    return code === '' ? undefined : code;
  }
}
