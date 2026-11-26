import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { IconName, IconProp } from '@fortawesome/fontawesome-svg-core';
import { QuestionFormSidepanelComponent } from '@fz-original/app/modules/customer-questions-catalog/components/question-form-sidepanel/question-form-sidepanel.component';
import {
  QuestionTypePickerData,
  QuestionTypePickerModalComponent,
  QuestionTypePickerResult,
} from '@fz-original/app/modules/customer-questions-catalog/components/question-type-picker-modal/question-type-picker-modal.component';
import {
  CustomerQuestionSidepanelData,
  MainPlanQuestionSidepanelInfo,
  QuestionSidepanelMode,
} from '@fz-original/app/modules/customer-questions-catalog/models/question-sidepanel.model';
import { GroupLeaf } from '@fz-original/app/shared/grouping/group-node.model';
import { toOrderedPayload } from '@fz-original/app/shared/grouping/ordered-group';
import {
  addClusterInSection,
  addLeafInSection,
  addLeafToClusterInSection,
  detachLeafFromClusterInSection,
  removeLeafFromClusterInSection,
  removeNodeInSection,
  reorderInSection,
  transferNode,
  ungroupClusterInSection,
} from '@fz-original/app/shared/grouping/sectioned-group';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { MainPlanQuestionInput } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question-input.model';
import { MainPlanQuestion } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question.model';
import { QuestionFrequency } from '@fz-original/app/shared/main-plan-questions/models/question-frequency.enum';
import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';
import {
  getFrequencyDescriptionKey,
  getFrequencyIcon,
  getFrequencyLabelKey,
  getWhenFormTitleKey,
  getWhenSubtitleKey,
} from '@fz-original/app/shared/main-plan-questions/utils/main-plan-question-labels.util';
import { optionalForWhen } from '@fz-original/app/shared/main-plan-questions/utils/main-plan-question-rules.util';
import { getHiddenQuestionTypes } from '@fz-original/app/shared/main-plan-questions/utils/question-form-types.util';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { IgntButtonComponent, IgntDialogRef, IgntDialogService, MENU } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, filter, finalize, forkJoin, Observable, of, Subject, switchMap, tap } from 'rxjs';

import { MpqDisplay, MpqFrequencySection, MpqWhenSection } from '../../models/event-customer-questions-view.model';
import { EventCustomerQuestionsFacade, MainPlanQuestionsData } from '../../services/event-customer-questions.facade';
import { buildSectionState, buildWhenSections, MpqSectionState, parseSectionKey } from '../../utils/build-mpq-sections.util';
import { buildDummyQuestionDisplay, DUMMY_QUESTION_ID } from '../../utils/dummy-question.util';

const EMPTY_DATA: MainPlanQuestionsData = { channelOptions: [], questions: [], sessionTypeOptions: [] };

interface MpqPlacement {
  display: MpqDisplay;
  frequency: QuestionFrequency;
  order: number;
  when: QuestionWhen;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule,
    NgTemplateOutlet,
    IgntButtonComponent,
    IgntExpansionPanelComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntListItemComponent,
    IgntSkeletonComponent,
    IgntTagComponent,
    TranslateModule,
    ...MENU,
  ],
  selector: 'app-event-customer-questions',
  standalone: true,
  styleUrl: './event-customer-questions.component.scss',
  templateUrl: './event-customer-questions.component.html',
})
export class EventCustomerQuestionsComponent {
  readonly planId = input.required<number>();

  readonly #facade = inject(EventCustomerQuestionsFacade);
  readonly #router = inject(Router);
  readonly #dialogService = inject(IgntDialogService);
  readonly #toast = inject(ToastService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly loading = signal<boolean>(true);
  protected readonly selectedQuestionId = signal<number | null>(null);
  protected readonly panelOpen = signal<boolean>(false);
  protected readonly canAssign = this.#facade.canAssign;
  protected readonly canCreate = this.#facade.canCreate;

  readonly #channelOptions = signal<SelectOption[]>([]);
  readonly #sessionTypeOptions = signal<SelectOption[]>([]);
  readonly #sectionState = signal<MpqSectionState[]>([]);

  protected readonly whenSections = computed<MpqWhenSection[]>(() => buildWhenSections(this.#sectionState()));

  #clusterSeq = 0;
  #openPanelRef: IgntDialogRef | null = null;
  #openModalRef: IgntDialogRef<QuestionTypePickerResult> | null = null;
  readonly #persist$ = new Subject<void>();

  constructor() {
    this.#destroyRef.onDestroy(() => this.#closePanel());

    toObservable(this.planId)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.#closePanel();
        }),
        switchMap(() => this.#refresh().pipe(finalize(() => this.loading.set(false)))),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();

    this.#persist$
      .pipe(
        switchMap(() =>
          this.#persistPlacements().pipe(
            catchError(() => {
              this.#handleSaveError();

              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  protected canViewResponses(view: MpqDisplay): boolean {
    return this.#facade.canViewAnswers && view.mainPlanQuestion.bookingQuestion.allowedCapabilities.canViewAnswers;
  }

  protected frequencyDescriptionKey(section: MpqFrequencySection): string {
    return getFrequencyDescriptionKey(section.frequency);
  }

  protected frequencyIcon(section: MpqFrequencySection): IconProp {
    return ['far', getFrequencyIcon(section.frequency) as IconName];
  }

  protected frequencyLabelKey(section: MpqFrequencySection): string {
    return getFrequencyLabelKey(section.frequency);
  }

  protected isSelected(view: MpqDisplay): boolean {
    return this.selectedQuestionId() === view.mainPlanQuestion.id;
  }

  protected onAddQuestion(key: string, clusterId?: string): void {
    if (this.panelOpen()) {
      return;
    }

    const { frequency, when } = parseSectionKey(key);
    const data: QuestionTypePickerData = {
      canCreateFromScratch: this.canCreate,
      hiddenTypes: getHiddenQuestionTypes({ frequency, when }),
      withSimilarQuestions: true,
    };
    this.panelOpen.set(true);
    const modalRef = this.#dialogService.openModal<QuestionTypePickerResult>(QuestionTypePickerModalComponent, { data, size: 'lg' });
    this.#openModalRef = modalRef;
    modalRef.closed$
      .pipe(
        tap(result => {
          this.#openModalRef = null;
          if (!result) {
            this.panelOpen.set(false);
          }
        }),
        filter((result): result is QuestionTypePickerResult => Boolean(result)),
        switchMap(result => this.#openAddSidepanel(key, result, clusterId)),
        catchError(() => {
          this.panelOpen.set(false);
          this.selectedQuestionId.set(null);
          this.#discardDummy(key, clusterId);
          this.#showToast('mainPlanQuestions.toasts.saveError', AlertSentiment.danger);

          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  protected onAddToGroup(key: string, nodeId: string, leaf: GroupLeaf<MpqDisplay>): void {
    const clusterId = this.#nearestClusterId(key, nodeId);
    if (!clusterId) {
      return;
    }

    this.#sectionState.update(state => addLeafToClusterInSection(removeNodeInSection(state, key, nodeId), key, clusterId, leaf));
    this.#persist$.next();
  }

  protected onCreateGroup(key: string): void {
    const { absorbed, sections } = addClusterInSection(this.#sectionState(), key, () => this.#nextClusterId());
    this.#sectionState.set(sections);

    if (absorbed) {
      this.#persist$.next();
    }
  }

  protected onDelete(key: string, view: MpqDisplay): void {
    const mainPlanQuestion = view.mainPlanQuestion;
    this.#dialogService
      .openConfirmModal(
        String(this.#translate.instant('customerQuestions.deleteConfirm.title')),
        String(this.#translate.instant('customerQuestions.deleteConfirm.message', { title: view.title })),
        { isDestructive: true },
      )
      .closed$.pipe(
        filter(Boolean),
        switchMap(() => this.#facade.deleteQuestion(this.planId(), mainPlanQuestion.id)),
        switchMap(() => this.#refresh()),
        switchMap(() => this.#persistPlacements()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => this.#handleSaveError(),
        next: () => this.#showToast('mainPlanQuestions.toasts.deleted', AlertSentiment.positive),
      });
  }

  protected onDrop(event: CdkDragDrop<string>, toKey: string): void {
    const fromKey = event.previousContainer.data;
    const sameSection = event.previousContainer === event.container;
    this.#sectionState.update(state =>
      sameSection
        ? reorderInSection(state, toKey, event.previousIndex, event.currentIndex)
        : transferNode(state, fromKey, toKey, event.previousIndex, event.currentIndex),
    );
    this.#persist$.next();
  }

  protected onQuestionClick(view: MpqDisplay): void {
    if (this.panelOpen()) {
      return;
    }

    if (view.editable) {
      this.#openEdit(view);

      return;
    }

    if (view.viewable) {
      this.#openReadonly(view);
    }
  }

  protected onRemoveFromGroup(key: string, clusterId: string, leafId: string): void {
    this.#sectionState.update(state => detachLeafFromClusterInSection(state, key, clusterId, leafId));
    this.#persist$.next();
  }

  protected onRemoveGroup(key: string, clusterId: string): void {
    this.#sectionState.update(state => ungroupClusterInSection(state, key, clusterId));
    this.#persist$.next();
  }

  protected onViewResponses(view: MpqDisplay): void {
    this.#router.navigate(['/customer-questions-responses', view.mainPlanQuestion.bookingQuestion.id], {
      queryParams: { from: 'event-settings', mainPlanId: this.planId() },
    });
  }

  protected sectionHasGroup(key: string): boolean {
    return (
      this.#sectionState()
        .find(section => section.key === key)
        ?.nodes.some(node => node.type === 'cluster') ?? false
    );
  }

  protected whenSubtitleKey(section: MpqWhenSection): string {
    return getWhenSubtitleKey(section.when);
  }

  protected whenTitleKey(section: MpqWhenSection): string {
    return getWhenFormTitleKey(section.when);
  }

  #applyData(data: MainPlanQuestionsData): void {
    this.#channelOptions.set(data.channelOptions);
    this.#sessionTypeOptions.set(data.sessionTypeOptions);

    this.#sectionState.set(buildSectionState(data.questions, this.canAssign, () => this.#nextClusterId()));
  }

  #buildNewSidepanelInfo(when: QuestionWhen, frequency: QuestionFrequency, order: number | null = null): MainPlanQuestionSidepanelInfo {
    return {
      answersAttachedTo: null,
      autoAnswerFrom: null,
      channelOptions: this.#channelOptions(),
      defaultValues: null,
      frequency,
      mainPlanId: this.planId(),
      mode: 'create',
      optional: true,
      order,
      partnerId: this.#facade.partnerId,
      selectedChannelIds: [],
      sessionTypeId: null,
      sessionTypeOptions: this.#sessionTypeOptions(),
      when,
    };
  }

  #buildSidepanelInfo(mainPlanQuestion: MainPlanQuestion, mode: QuestionSidepanelMode): MainPlanQuestionSidepanelInfo {
    const placement = this.#livePlacement(mainPlanQuestion.id);

    return {
      answersAttachedTo: mainPlanQuestion.answersAttachedTo,
      autoAnswerFrom: mainPlanQuestion.autoAnswerFrom,
      channelOptions: this.#channelOptions(),
      defaultValues: mainPlanQuestion.defaultValues,
      frequency: placement?.frequency ?? mainPlanQuestion.frequency,
      mainPlanId: this.planId(),
      mainPlanQuestionId: mainPlanQuestion.id,
      mode,
      optional: mainPlanQuestion.optional,
      order: placement?.order ?? mainPlanQuestion.order,
      partnerId: this.#facade.partnerId,
      selectedChannelIds: mainPlanQuestion.channelIds,
      sessionTypeId: mainPlanQuestion.sessionTypeId,
      sessionTypeOptions: this.#sessionTypeOptions(),
      when: placement?.when ?? mainPlanQuestion.when,
    };
  }

  #closePanel(): void {
    this.#openModalRef?.close();
    this.#openModalRef = null;
    this.#openPanelRef?.close();
    this.#openPanelRef = null;
    this.panelOpen.set(false);
    this.selectedQuestionId.set(null);
  }

  #discardDummy(key: string, clusterId: string | undefined): void {
    this.#sectionState.update(state =>
      clusterId
        ? removeLeafFromClusterInSection(state, key, clusterId, String(DUMMY_QUESTION_ID))
        : removeNodeInSection(state, key, String(DUMMY_QUESTION_ID)),
    );
  }

  #handleSaveError(): void {
    this.#showToast('mainPlanQuestions.toasts.saveError', AlertSentiment.danger);
    this.#refresh().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #livePlacement(mainPlanQuestionId: number): MpqPlacement | undefined {
    return this.#placements().find(placement => placement.display.mainPlanQuestion.id === mainPlanQuestionId);
  }

  #nearestClusterId(key: string, nodeId: string): string | null {
    const nodes = this.#sectionState().find(section => section.key === key)?.nodes ?? [];
    const nodeIndex = nodes.findIndex(node => (node.type === 'leaf' ? node.leaf.id : node.cluster.id) === nodeId);
    if (nodeIndex === -1) {
      return null;
    }

    let nearestId: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const [index, node] of nodes.entries()) {
      if (node.type !== 'cluster') {
        continue;
      }

      const distance = Math.abs(index - nodeIndex);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = node.cluster.id;
      }
    }

    return nearestId;
  }

  #nextClusterId(): string {
    this.#clusterSeq++;

    return `cluster-${this.#clusterSeq}`;
  }

  #openAddSidepanel(key: string, result: QuestionTypePickerResult, clusterId?: string): Observable<unknown> {
    const { frequency, when } = parseSectionKey(key);
    const display = buildDummyQuestionDisplay({
      frequency,
      mainPlanId: this.planId(),
      placeholderDescription: String(this.#translate.instant('customerQuestions.newQuestionPlaceholder.description')),
      placeholderTitle: String(this.#translate.instant('customerQuestions.newQuestionPlaceholder.title')),
      question: result.question ?? null,
      type: result.type,
      when,
    });
    const leaf: GroupLeaf<MpqDisplay> = { id: String(DUMMY_QUESTION_ID), value: display };
    this.#sectionState.update(state =>
      clusterId ? addLeafToClusterInSection(state, key, clusterId, leaf) : addLeafInSection(state, key, leaf),
    );
    this.selectedQuestionId.set(DUMMY_QUESTION_ID);

    const placement = this.#livePlacement(DUMMY_QUESTION_ID);
    if (!placement) {
      throw new Error('Optimistic placeholder is missing from the section state');
    }

    const data: CustomerQuestionSidepanelData = {
      mainPlanQuestion: this.#buildNewSidepanelInfo(when, frequency, placement.order),
      question: {
        customerQuestion: result.question,
        mode: result.createFromScratch ? 'create' : 'view',
        type: result.type,
      },
    };
    return this.#openSidepanel(data, true, () => this.#discardDummy(key, clusterId));
  }

  #openEdit(view: MpqDisplay): void {
    const mainPlanQuestion = view.mainPlanQuestion;
    this.selectedQuestionId.set(mainPlanQuestion.id);

    const data: CustomerQuestionSidepanelData = {
      mainPlanQuestion: this.#buildSidepanelInfo(mainPlanQuestion, 'edit'),
      question: { customerQuestion: mainPlanQuestion.bookingQuestion, mode: 'view', type: mainPlanQuestion.bookingQuestion.type },
    };
    this.#openSidepanel(data, true).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #openReadonly(view: MpqDisplay): void {
    const mainPlanQuestion = view.mainPlanQuestion;
    this.selectedQuestionId.set(mainPlanQuestion.id);

    const data: CustomerQuestionSidepanelData = {
      mainPlanQuestion: this.#buildSidepanelInfo(mainPlanQuestion, 'view'),
      question: { customerQuestion: mainPlanQuestion.bookingQuestion, mode: 'view', type: mainPlanQuestion.bookingQuestion.type },
    };
    this.#openSidepanel(data, false).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #openSidepanel(data: CustomerQuestionSidepanelData, reloadOnSave: boolean, onDiscard?: () => void): Observable<unknown> {
    const previousPanelRef = this.#openPanelRef;
    const panelRef = this.#dialogService.openSidePanel(QuestionFormSidepanelComponent, {
      data,
      disableCloseShortcuts: true,
      size: 'lg',
    });
    this.#openPanelRef = panelRef;
    this.panelOpen.set(true);
    previousPanelRef?.close();

    return panelRef.closed$.pipe(
      filter(() => this.#openPanelRef === panelRef),
      tap(() => {
        this.#openPanelRef = null;
        this.panelOpen.set(false);
        this.selectedQuestionId.set(null);
      }),
      switchMap(result => {
        if (result) {
          return reloadOnSave ? this.#refresh() : EMPTY;
        }

        onDiscard?.();

        return EMPTY;
      }),
    );
  }

  #persistPlacements(): Observable<unknown> {
    const updates = this.#placements()
      .filter(placement => placement.display.editable && placement.display.mainPlanQuestion.id !== DUMMY_QUESTION_ID)
      .map(placement =>
        this.#facade.updateQuestion(
          this.planId(),
          placement.display.mainPlanQuestion.id,
          this.#toInput(placement.display.mainPlanQuestion, placement.when, placement.frequency, placement.order),
        ),
      );

    return updates.length === 0 ? of(undefined) : forkJoin(updates);
  }

  #placements(): MpqPlacement[] {
    return this.whenSections().flatMap(whenSection =>
      whenSection.frequencies.flatMap(frequencySection =>
        toOrderedPayload(frequencySection.items, (display, order) => ({
          display,
          frequency: frequencySection.frequency,
          order,
          when: whenSection.when,
        })),
      ),
    );
  }

  #refresh(): Observable<MainPlanQuestionsData> {
    return this.#facade.loadQuestions(this.planId()).pipe(
      catchError(() => of(EMPTY_DATA)),
      tap(data => this.#applyData(data)),
    );
  }

  #showToast(messageKey: string, sentiment: AlertSentiment): void {
    this.#toast.add({ autoHide: true, delay: 5000, message: this.#translate.instant(messageKey), sentiment });
  }

  #toInput(question: MainPlanQuestion, when: QuestionWhen, frequency: QuestionFrequency, order: number): MainPlanQuestionInput {
    return {
      answersAttachedTo: question.answersAttachedTo,
      autoAnswerFrom: question.autoAnswerFrom,
      channelIds: question.channelIds,
      defaultValues: question.defaultValues,
      frequency,
      optional: optionalForWhen(when, question.optional),
      order,
      sessionTypeId: question.sessionTypeId,
      when,
    };
  }
}
