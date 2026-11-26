import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal, Signal } from '@angular/core';

import { Block } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/models/block.model';
import { DescriptionTranslationComponent } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/components/description-translation/description-translation.component';
import { DescriptionTranslationStatusMap } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/models/description-translation.model';
import { extractDescriptionTranslationOverlay } from '@fz-original/app/modules/content-plan/components/plan-edition/plan-translations-edition/utils/description-translation.adapter';
import {
  countPlanTermsSlot,
  countPlanTranslationSlots,
  countSessionTypeTranslationSlots,
  isHtmlMeaningful,
  isPlanFieldPopulated,
  isSessionTypeFieldPopulated,
  planFieldCountsInTotal,
  PlanTranslationOriginals,
  resolveTermsAndConditionsDisplayHtml,
  sessionTypeFieldCountsInTotal,
  SessionTypeTranslationOriginals,
  TranslationSlotCounts,
} from '@fz-original/app/modules/content-plan/utils/default-translation-field-catalog';
import { TooltipIconComponent } from '@fz-original/app/shared/components/tooltip-icon/tooltip-icon.component';
import { TranslationTextFieldComponent } from '@fz-original/app/shared/components/translation-text-field/translation-text-field.component';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { AvailableLanguage } from '@fz-original/app/shared/translations/models/available-language.model';
import { IgntAlertComponent, IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, Observable } from 'rxjs';

import { PlanSessionType } from '../../../../models/plan-session-types.model';
import { PlanTranslation } from '../../../../models/plan-translation.model';

interface TranslationContentItem {
  id: string;
  isExpanded: boolean;
  titleKey: string;
  totalCount: number;
  translatedCount: number;
}

export interface SessionTypeTranslationItem {
  channelId: string | null;
  channels: string[];
  details: string;
  displayName: string;
  entityId: number;
  instructions: string;
  isExpanded: boolean;
  label: string;
  published: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DescriptionTranslationComponent,
    IgntAlertComponent,
    IgntButtonComponent,
    IgntIconComponent,
    IgntToggleComponent,
    TooltipIconComponent,
    TranslateModule,
    TranslationTextFieldComponent,
  ],
  selector: 'app-translation-content',
  styleUrl: './translation-content.component.scss',
  templateUrl: './translation-content.component.html',
})
export class TranslationContentComponent {
  readonly #userService = inject(UserService);
  readonly #expandedSessionTypeIds = signal<ReadonlySet<number>>(new Set<number>());

  hideTicketTypesNotOnSale = model<boolean>(false);
  contentSchema = input<Block[]>([]);
  defaultLanguage = input<AvailableLanguage | null>(null);
  descriptionComponentTotalCount = input<number>(0);
  descriptionComponentTranslatedCount = input<number>(0);
  descriptionInherited = input<boolean>(false);
  descriptionStatusByCode = input<DescriptionTranslationStatusMap>({});
  hasComponentsDescription = input<boolean>(false);
  originalLabelFormat = input<string>('');
  originalShortDescription = input<string>('');
  planSessionTypes = input<PlanSessionType[]>([]);
  requiredPurchaseTermsSourceHtml = input<string>('');
  selectedChannelId = input<string | null>(null);
  selectedLanguage = input<AvailableLanguage | null>(null);
  sessionTypes = input<SessionTypeTranslationItem[]>([]);
  showTermsAndConditionsSection = input<boolean>(false);
  termsAndConditionsTranslatedHtml = input<string>('');
  translations = input<PlanTranslation[]>([]);

  readonly canManageLabelFormatTranslations = this.#userService.hasPermission(Permissions.CAN_MANAGE_LABEL_FORMAT_TRANSLATIONS);

  goToContent = output<void>();

  readonly channelHasNoSchema: Signal<boolean> = computed<boolean>(
    () => this.selectedChannelId() !== null && this.hasComponentsDescription() && this.contentSchema().length === 0,
  );

  readonly showComponentDescription: Signal<boolean> = computed<boolean>(
    () => this.hasComponentsDescription() && this.contentSchema().length > 0,
  );

  readonly descriptionOverlay = computed(() => extractDescriptionTranslationOverlay(this.contentSchema()));

  readonly noopUploadCallback = (): Observable<string> => EMPTY;

  readonly contentItems = signal<TranslationContentItem[]>([
    {
      id: 'event-content',
      isExpanded: false,
      titleKey: 'planEdition.translationsEdition.eventContentTitle',
      totalCount: 4,
      translatedCount: 0,
    },
    {
      id: 'ticket-types',
      isExpanded: false,
      titleKey: 'planEdition.translationsEdition.ticketTypesTitle',
      totalCount: 3,
      translatedCount: 0,
    },
    {
      id: 'terms-and-conditions',
      isExpanded: false,
      titleKey: 'planEdition.translationsEdition.termsAndConditionsSectionTitle',
      totalCount: 1,
      translatedCount: 0,
    },
  ]);

  readonly selectedTranslation = computed<PlanTranslation | null>(() => {
    const selectedLanguage = this.selectedLanguage();
    if (!selectedLanguage) {
      return null;
    }
    const selectedChannelId = this.selectedChannelId();
    return this.translations().find(t => t.language === selectedLanguage.code && t.channelId === selectedChannelId) || null;
  });

  // Reads the selection, not `selectedTranslation`: the default language may have no default-channel row yet.
  readonly isDefaultLanguageOnDefaultChannel = computed<boolean>(() => {
    const selectedLanguage = this.selectedLanguage();
    return selectedLanguage !== null && this.selectedChannelId() === null && selectedLanguage.code === this.defaultLanguage()?.code;
  });

  readonly dynamicContentItems = computed<TranslationContentItem[]>(() => {
    const selectedTranslation = this.selectedTranslation();

    return this.#visibleContentItems().map(item => ({
      ...item,
      totalCount: this.#totalCountForContentItem(item),
      translatedCount: this.#translatedCountForContentItem(item.id, selectedTranslation),
    }));
  });

  get isDescriptionComponentComplete(): boolean {
    return this.descriptionComponentTotalCount() > 0 && this.descriptionComponentTranslatedCount() >= this.descriptionComponentTotalCount();
  }

  isDescriptionPreviewMeaningful(description: string | undefined): boolean {
    return isPlanFieldPopulated('description', description);
  }

  get isRequiredPurchaseTermsSourceMeaningful(): boolean {
    return isHtmlMeaningful(this.requiredPurchaseTermsSourceHtml());
  }

  isSectionComplete(item: TranslationContentItem): boolean {
    return item.totalCount === 0 || item.translatedCount >= item.totalCount;
  }

  isSessionTypeDetailsPreviewMeaningful(details: string | undefined): boolean {
    return isSessionTypeFieldPopulated('details', details);
  }

  isSessionTypeExpanded(entityId: number): boolean {
    return this.#expandedSessionTypeIds().has(entityId);
  }

  isSessionTypeInstructionsPreviewMeaningful(instructions: string | undefined): boolean {
    return isSessionTypeFieldPopulated('instructions', instructions);
  }

  get isTermsConditionsTranslationMeaningful(): boolean {
    return isHtmlMeaningful(this.termsReadonlyDisplayHtml);
  }

  onHideTicketTypesNotOnSaleToggleChange(event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    this.hideTicketTypesNotOnSale.set(checked);
  }

  get shouldCountEventShortDescriptionField(): boolean {
    return planFieldCountsInTotal('shortDescription', this.#planTranslationOriginals());
  }

  shouldCountSessionTypeOptionalField(entityId: number, field: 'details' | 'instructions'): boolean {
    return sessionTypeFieldCountsInTotal(field, this.#sessionTypeTranslationOriginals(entityId));
  }

  get shouldShowDescriptionComponentBadge(): boolean {
    return this.hasComponentsDescription() && !this.isDefaultLanguageOnDefaultChannel() && this.descriptionComponentTotalCount() > 0;
  }

  shouldShowSectionStatusIcon(item: TranslationContentItem): boolean {
    return item.id !== 'terms-and-conditions';
  }

  get termsReadonlyDisplayHtml(): string {
    if (!this.isDefaultLanguageOnDefaultChannel()) {
      return this.termsAndConditionsTranslatedHtml();
    }
    return resolveTermsAndConditionsDisplayHtml({
      isDefaultLanguageOnDefaultChannel: true,
      requiredPurchaseTermsSourceHtml: this.requiredPurchaseTermsSourceHtml(),
      termsAndConditionsTranslatedHtml: this.termsAndConditionsTranslatedHtml(),
    });
  }

  toggleContentItem(itemId: string): void {
    this.contentItems.update(items => items.map(item => (item.id === itemId ? { ...item, isExpanded: !item.isExpanded } : item)));
  }

  toggleSessionTypeExpansion(index: number): void {
    const item = this.sessionTypes()[index];
    if (item) {
      this.#expandedSessionTypeIds.update(expandedIds => {
        const nextExpandedIds = new Set(expandedIds);
        if (!nextExpandedIds.delete(item.entityId)) {
          nextExpandedIds.add(item.entityId);
        }
        return nextExpandedIds;
      });
    }
  }

  #eventContentSlotCounts(translation: PlanTranslation | null): TranslationSlotCounts {
    const base = countPlanTranslationSlots(translation, this.#planTranslationOriginals());
    if (!this.hasComponentsDescription()) {
      return base;
    }
    return {
      total: base.total + this.descriptionComponentTotalCount(),
      translated: base.translated + this.descriptionComponentTranslatedCount(),
    };
  }

  #planTranslationOriginals(): PlanTranslationOriginals {
    return {
      // NOT `hasComponentsDescription`: that drops the description even when no components count in its place.
      excludeDescription: this.showComponentDescription(),
      originalLabelFormat: this.canManageLabelFormatTranslations ? this.originalLabelFormat() : '',
      originalShortDescription: this.originalShortDescription(),
    };
  }

  #sessionTypeTranslationOriginals(entityId: number): SessionTypeTranslationOriginals {
    const originalSessionType = this.planSessionTypes().find(sessionType => sessionType.id === entityId);
    return {
      originalDetails: originalSessionType?.details ?? '',
      originalInstructions: originalSessionType?.instructions ?? '',
    };
  }

  #termsSlotCounts(): TranslationSlotCounts {
    if (!this.showTermsAndConditionsSection()) {
      return { total: 0, translated: 0 };
    }
    return countPlanTermsSlot({
      requiredPurchaseTermsSourceHtml: this.requiredPurchaseTermsSourceHtml(),
      termsAndConditionsHtml: this.termsReadonlyDisplayHtml,
    });
  }

  #ticketTypesSlotCounts(): TranslationSlotCounts {
    return this.sessionTypes().reduce(
      (counts: TranslationSlotCounts, sessionType: SessionTypeTranslationItem) => {
        const sessionCounts = countSessionTypeTranslationSlots(
          {
            details: sessionType.details,
            instructions: sessionType.instructions,
            label: sessionType.label,
          },
          this.#sessionTypeTranslationOriginals(sessionType.entityId),
        );
        return {
          total: counts.total + sessionCounts.total,
          translated: counts.translated + sessionCounts.translated,
        };
      },
      { total: 0, translated: 0 },
    );
  }

  #totalCountForContentItem(item: TranslationContentItem): number {
    switch (item.id) {
      case 'event-content':
        return this.#eventContentSlotCounts(null).total;
      case 'ticket-types':
        return this.#ticketTypesSlotCounts().total;
      case 'terms-and-conditions':
        return this.#termsSlotCounts().total;
      default:
        return item.totalCount;
    }
  }

  #translatedCountForContentItem(itemId: string, selectedTranslation: PlanTranslation | null): number {
    switch (itemId) {
      case 'event-content':
        return this.#eventContentSlotCounts(selectedTranslation).translated;
      case 'ticket-types':
        return this.#ticketTypesSlotCounts().translated;
      case 'terms-and-conditions':
        return this.#termsSlotCounts().translated;
      default:
        return 0;
    }
  }

  #visibleContentItems(): TranslationContentItem[] {
    return this.contentItems().filter(item => item.id !== 'terms-and-conditions' || this.showTermsAndConditionsSection());
  }
}
