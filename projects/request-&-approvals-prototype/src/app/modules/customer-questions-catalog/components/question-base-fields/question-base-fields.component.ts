import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { CustomerQuestionChoiceInput } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-input.model';
import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';
import { CustomerQuestion, CustomerQuestionChoice } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question.model';
import { GroupLeaf, GroupNode, GroupNodeView } from '@fz-original/app/shared/grouping/group-node.model';
import {
  addCluster,
  addLeaf,
  addLeafToCluster,
  buildNodes,
  buildNodeViews,
  flattenLeaves,
  mapLeafValues,
  removeLeafFromCluster,
  removeNode,
  reorderNodes,
  toOrderedPayload,
  ungroupCluster,
} from '@fz-original/app/shared/grouping/ordered-group';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { QuestionBaseValue } from '../../models/question-sidepanel.model';
import { CUSTOMER_QUESTION_TYPE_FILTER_OPTIONS, isChoiceQuestionType } from '../../utils/customer-question-type.util';
import { QuestionTypeTagsComponent } from '../question-type-tags/question-type-tags.component';

interface EditableChoice {
  additionalControl: FormControl<string>;
  includeAdditionalQuestion: WritableSignal<boolean>;
  labelControl: FormControl<string>;
}

type ChoiceNode = GroupNode<EditableChoice>;
type ChoiceNodeView = GroupNodeView<EditableChoice>;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule,
    NgTemplateOutlet,
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntTextareaFieldComponent,
    QuestionTypeTagsComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-question-base-fields',
  standalone: true,
  styleUrl: './question-base-fields.component.scss',
  templateUrl: './question-base-fields.component.html',
})
export class QuestionBaseFieldsComponent implements OnInit {
  readonly availableTypes = input<CustomerQuestionType[]>(CUSTOMER_QUESTION_TYPE_FILTER_OPTIONS);
  readonly editable = input<boolean>(false);
  readonly question = input<CustomerQuestion | undefined>(undefined);
  readonly type = input<CustomerQuestionType | undefined>(undefined);
  readonly typeSelectable = input<boolean>(false);

  readonly selectedType = signal<CustomerQuestionType>(CustomerQuestionType.TEXT);
  readonly isChoiceType = computed<boolean>(() => isChoiceQuestionType(this.selectedType()));

  protected readonly titleControl = new FormControl<string>('', { nonNullable: true });
  protected readonly descriptionControl = new FormControl<string>('', { nonNullable: true });

  readonly #destroyRef = inject(DestroyRef);
  readonly #choiceNodes = signal<ChoiceNode[]>([]);
  readonly #labelsRevision = signal<number>(0);

  protected readonly choiceViews: Signal<ChoiceNodeView[]> = computed<ChoiceNodeView[]>(() =>
    buildNodeViews(this.#choiceNodes(), () => this.editable()),
  );

  readonly choices: Signal<CustomerQuestionChoiceInput[]> = computed<CustomerQuestionChoiceInput[]>(() => {
    this.#labelsRevision();

    return this.#buildChoicesPayload();
  });

  #idCounter = 0;

  ngOnInit(): void {
    const question = this.question();
    this.selectedType.set(question?.type ?? this.type() ?? CustomerQuestionType.TEXT);
    this.titleControl.setValue(question?.title ?? '');
    this.descriptionControl.setValue(question?.description ?? '');
    this.#choiceNodes.set(this.#buildInitialChoices());
  }

  valid(): boolean {
    if (!this.titleControl.value.trim() || !this.descriptionControl.value.trim()) {
      return false;
    }

    return !this.isChoiceType() || this.#areChoicesValid();
  }

  value(): QuestionBaseValue {
    return {
      choices: this.isChoiceType() ? this.#buildChoicesPayload() : null,
      description: this.descriptionControl.value.trim(),
      title: this.titleControl.value.trim(),
      type: this.selectedType(),
    };
  }

  protected addAdditionalQuestion(choice: EditableChoice): void {
    choice.includeAdditionalQuestion.set(true);
  }

  protected addChoice(): void {
    this.#choiceNodes.update(nodes => addLeaf(nodes, this.#newLeaf(this.#createChoice())));
  }

  protected addChoiceInGroup(clusterId: string): void {
    this.#choiceNodes.update(nodes => addLeafToCluster(nodes, clusterId, this.#newLeaf(this.#createChoice())));
  }

  protected addGroup(): void {
    this.#choiceNodes.update(nodes => addCluster(nodes, () => this.#nextId()));
  }

  protected onChoiceDrop(event: CdkDragDrop<ChoiceNode[]>): void {
    this.#choiceNodes.update(nodes => reorderNodes(nodes, event.previousIndex, event.currentIndex));
  }

  protected removeAdditionalQuestion(choice: EditableChoice): void {
    choice.includeAdditionalQuestion.set(false);
    choice.additionalControl.setValue('');
  }

  protected removeChoice(nodeId: string): void {
    this.#choiceNodes.update(nodes => removeNode(nodes, nodeId));
  }

  protected removeChoiceInGroup(clusterId: string, leafId: string): void {
    this.#choiceNodes.update(nodes => removeLeafFromCluster(nodes, clusterId, leafId));
  }

  protected removeGroup(clusterId: string): void {
    this.#choiceNodes.update(nodes => ungroupCluster(nodes, clusterId));
  }

  protected selectType(type: CustomerQuestionType): void {
    this.selectedType.set(type);
  }

  #areChoicesValid(): boolean {
    const choices = this.#flatChoices();
    if (choices.length === 0) {
      return false;
    }

    return choices.every(
      choice =>
        choice.labelControl.value.trim().length > 0 &&
        (!choice.includeAdditionalQuestion() || choice.additionalControl.value.trim().length > 0),
    );
  }

  #buildChoicesPayload(): CustomerQuestionChoiceInput[] {
    return toOrderedPayload(this.choiceViews(), (choice, order) => this.#toChoiceInput(choice, order));
  }

  #buildInitialChoices(): ChoiceNode[] {
    const question = this.question();
    if (!question?.choices) {
      return [];
    }

    const nodes = buildNodes(
      question.choices.map(choice => ({ id: choice.id, value: choice })),
      choice => choice.order,
      () => this.#nextId(),
    );

    return mapLeafValues(nodes, choice => this.#toEditableChoice(choice));
  }

  #createChoice(label = '', additional = '', includeAdditionalQuestion = false): EditableChoice {
    const labelControl = new FormControl<string>(label, { nonNullable: true });
    labelControl.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#labelsRevision.update(revision => revision + 1));

    return {
      additionalControl: new FormControl<string>(additional, { nonNullable: true }),
      includeAdditionalQuestion: signal(includeAdditionalQuestion),
      labelControl,
    };
  }

  #flatChoices(): EditableChoice[] {
    return flattenLeaves(this.#choiceNodes()).map(leaf => leaf.value);
  }

  #newLeaf(choice: EditableChoice): GroupLeaf<EditableChoice> {
    return { id: this.#nextId(), value: choice };
  }

  #nextId(): string {
    this.#idCounter++;

    return `node-${this.#idCounter}`;
  }

  #toChoiceInput(choice: EditableChoice, order: number): CustomerQuestionChoiceInput {
    const includeAdditionalQuestion = choice.includeAdditionalQuestion();

    return {
      additionalQuestionMessage: includeAdditionalQuestion ? choice.additionalControl.value.trim() : null,
      includeAdditionalQuestion,
      label: choice.labelControl.value.trim(),
      order,
    };
  }

  #toEditableChoice(choice: CustomerQuestionChoice): EditableChoice {
    const includeAdditionalQuestion = choice.includeAdditionalQuestion && !!choice.additionalQuestionMessage;

    return this.#createChoice(choice.label, choice.additionalQuestionMessage ?? '', includeAdditionalQuestion);
  }
}
