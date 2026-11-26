import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  OutputEmitterRef,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';

import { Block } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/models/block.model';
import { TranslationFieldCountBadgeComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/components/translation-field-count-badge/translation-field-count-badge.component';
import { DescriptionTranslationStatusMap } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/models/description-translation.model';
import {
  SessionTypeTranslationItem,
  TranslationContentComponent,
} from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/translation-content/translation-content.component';
import { PlanSessionType } from '@fz-original/app/modules/content-plan/models/plan-session-types.model';
import { PlanTranslation } from '@fz-original/app/modules/content-plan/models/plan-translation.model';
import { SessionTypeTranslation } from '@fz-original/app/modules/content-plan/models/session-type-translation.model';
import { hasOverrideRow } from '@fz-original/app/modules/content-plan/utils/channel-translation-completeness.util';
import { buildDefaultTranslationSessionTypeItems } from '@fz-original/app/modules/content-plan/utils/default-translation-session-type-items.util';
import { planTranslationDisplayNameFromAvailableLanguage } from '@fz-original/app/modules/content-plan/utils/plan-translation-locale.util';
import { AvailableLanguage } from '@fz-original/app/shared/translations/models/available-language.model';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntIconComponent,
    IgntTagComponent,
    IgntToggleComponent,
    TranslateModule,
    TranslationContentComponent,
    TranslationFieldCountBadgeComponent,
  ],
  selector: 'app-plan-translations-content',
  standalone: true,
  styleUrl: './plan-translations-content.component.scss',
  templateUrl: './plan-translations-content.component.html',
})
export class PlanTranslationsContentComponent {
  readonly canEditDefaultTranslations = input<boolean>(false);
  readonly canManageChannelTranslations = input<boolean>(false);
  readonly contentSchema = input<Block[]>([]);
  readonly defaultLanguage = input<AvailableLanguage | null>(null);
  readonly descriptionComponentTotalCount = input<number>(0);
  readonly descriptionComponentTranslatedCount = input<number>(0);
  readonly descriptionInherited = input<boolean>(false);
  readonly descriptionStatusByCode = input<DescriptionTranslationStatusMap>({});
  readonly hasComponentsDescription = input<boolean>(false);
  readonly hasLanguages = input<boolean>(false);
  readonly isDefault = input<boolean>(false);
  readonly languageCode = input<string>('');
  readonly languageName = input<string>('');
  readonly originalLabelFormat = input<string>('');
  readonly originalShortDescription = input<string>('');
  readonly planSessionTypes = input<readonly PlanSessionType[]>([]);
  readonly planTranslations = input<readonly PlanTranslation[]>([]);
  readonly requiredPurchaseTermsSourceHtml = input<string>('');
  readonly selectedChannelId = input<string | null>(null);
  readonly selectedChannelName = input<string>('');
  readonly selectedLanguage = input<AvailableLanguage | null>(null);
  readonly sessionTypeTranslationsByEntityId = input<ReadonlyMap<number, readonly SessionTypeTranslation[]>>(new Map());
  readonly showTermsAndConditionsSection = input<boolean>(false);
  readonly showTranslationsByChannelToggle = input<boolean>(false);
  readonly termsAndConditionsTranslatedHtml = input<string>('');
  readonly totalFieldCount = input<number>(0);
  readonly translatedFieldCount = input<number>(0);
  readonly translationsByChannelEnabled = input<boolean>(false);

  readonly editClick: OutputEmitterRef<void> = output<void>();
  readonly goToContent: OutputEmitterRef<void> = output<void>();
  readonly removeOverrideClick: OutputEmitterRef<void> = output<void>();
  readonly translationsByChannelToggled: OutputEmitterRef<boolean> = output<boolean>();

  readonly hideTicketTypesNotOnSale: WritableSignal<boolean> = signal<boolean>(false);

  readonly displayLanguage: Signal<string> = computed<string>(() => {
    const nameFromParent = this.languageName().trim();
    const label =
      nameFromParent !== ''
        ? nameFromParent
        : this.languageCode() === ''
          ? ''
          : planTranslationDisplayNameFromAvailableLanguage(this.selectedLanguage() ?? { code: this.languageCode(), name: '' });
    const channel = this.selectedChannelName().trim();
    return channel === '' ? label : `${label} (${channel})`;
  });
  readonly hasSelectedLanguage: Signal<boolean> = computed<boolean>(() => this.languageCode() !== '');
  readonly isDefaultScope: Signal<boolean> = computed<boolean>(() => this.isDefault() && this.selectedChannelId() === null);
  readonly shouldRenderFieldList: Signal<boolean> = computed<boolean>(() => this.hasSelectedLanguage());
  readonly shouldRenderHeaderCount: Signal<boolean> = computed<boolean>(() => this.totalFieldCount() > 0);
  readonly canEditScope: Signal<boolean> = computed<boolean>(() => {
    if (this.selectedChannelId() !== null) {
      return this.canManageChannelTranslations();
    }
    return !this.isDefault() && this.canEditDefaultTranslations();
  });
  readonly shouldRenderEditButton: Signal<boolean> = this.canEditScope;
  readonly hasOverrideForCurrentScope: Signal<boolean> = computed<boolean>(() => {
    const channelId = this.selectedChannelId();
    if (channelId === null) {
      return false;
    }
    const language = this.languageCode();
    if (language === '') {
      return false;
    }
    return hasOverrideRow(this.planTranslations(), this.sessionTypeTranslationsByEntityId(), channelId, language);
  });
  readonly shouldRenderRemoveOverrideButton: Signal<boolean> = computed<boolean>(
    () => this.selectedChannelId() !== null && this.canManageChannelTranslations() && this.hasOverrideForCurrentScope(),
  );

  readonly translationsForFieldList: Signal<PlanTranslation[]> = computed<PlanTranslation[]>(() => {
    const channelId = this.selectedChannelId();
    return this.planTranslations().filter((translation: PlanTranslation) => translation.channelId === channelId);
  });
  readonly sessionTypesForFieldList: Signal<SessionTypeTranslationItem[]> = computed<SessionTypeTranslationItem[]>(() => {
    const allItems = this.#buildSessionTypesForFieldList();
    if (!this.hideTicketTypesNotOnSale()) {
      return allItems;
    }
    return allItems.filter((item: SessionTypeTranslationItem) => item.published && item.channels.length > 0);
  });
  readonly shouldShowEmptyTicketTypesMessage: Signal<boolean> = computed<boolean>(
    () => this.hideTicketTypesNotOnSale() && this.planSessionTypes().length > 0 && this.sessionTypesForFieldList().length === 0,
  );

  onDisableHideTicketTypesNotOnSale(): void {
    this.hideTicketTypesNotOnSale.set(false);
  }

  onTranslationsByChannelToggleChange(event: Event): void {
    const checked: boolean = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.translationsByChannelToggled.emit(checked);
  }

  #buildSessionTypesForFieldList(): SessionTypeTranslationItem[] {
    return buildDefaultTranslationSessionTypeItems({
      channelId: this.selectedChannelId(),
      language: this.languageCode(),
      planSessionTypes: this.planSessionTypes(),
      sessionTypeTranslationsByEntityId: this.sessionTypeTranslationsByEntityId(),
    });
  }
}
