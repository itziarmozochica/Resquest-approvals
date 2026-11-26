import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, output, signal, Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';

import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, finalize, forkJoin, map, Observable, of, switchMap, tap } from 'rxjs';

import { TemplatedTooltipDirective } from '../../../../../shared/directives/templated-tooltip.directive';
import { IgntTypeaheadModule } from '../../../../../shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { MultiSelectModule } from '../../../../../shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '../../../../../shared/layout/filters/select/select.interface';
import { TypeaheadEvent } from '../../../../../shared/layout/filters/typeahead/typeahead-event.model';
import { PlanStatus } from '../../../../../shared/models/plan/plan-status.enum';
import { WithUnsavedChangesGuardComponent } from '../../../../../shared/models/with-unsaved-changes-guard-component.model';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { Permissions } from '../../../../../shared/services/user/permissions';
import { UserService } from '../../../../../shared/services/user/user.service';
import { AvailableTags, CustomLabelType, PlanTags, TaxonomyHierarchy, UpdatePlanTags } from '../../../models/tags.model';
import { EditingPlanService } from '../../../services/editing-plan/editing-plan.service';
import { TagsService } from '../../../services/tags/tags.service';
import { mapCustomLabelsToOptions, mapTaxonomyTermsToOptions, OrphanOption } from './plan-tags-edition.mappers';
import { maxArrayLengthValidator } from './plan-tags-edition.util';

type ComponentState = 'loading' | 'error' | 'ok';

export interface TaxonomySelectorModel {
  displayLabel: string;
  error: string | null;
  hierarchy: TaxonomyHierarchy;
  options: SelectOption[];
  selectedOptions: SelectOption[];
}

export interface CustomLabelSelectorModel {
  error: string | null;
  maxLabelsPerPlan: number | null;
  options: SelectOption[];
  selectedOptions: SelectOption[];
}

type OrderedSelectorModel =
  | {
      kind: 'customLabel';
      selector: CustomLabelSelectorModel;
      sortLabel: string;
      type: CustomLabelType;
    }
  | {
      kind: 'taxonomy';
      selector: TaxonomySelectorModel;
      sortLabel: string;
    };

type TaxonomyOrderedSelectorModel = Extract<OrderedSelectorModel, { kind: 'taxonomy' }>;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntIconComponent,
    IgntSkeletonBaseComponent,
    IgntTypeaheadModule,
    MultiSelectModule,
    NgTemplateOutlet,
    TemplatedTooltipDirective,
    TranslateModule,
  ],
  selector: 'app-plan-tags-edition',
  standalone: true,
  styleUrl: './plan-tags-edition.component.scss',
  templateUrl: './plan-tags-edition.component.html',
})
export class PlanTagsEditionComponent implements OnInit, WithUnsavedChangesGuardComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #partnerService = inject(PartnerService);
  readonly #userService = inject(UserService);
  readonly #tagsService = inject(TagsService);
  readonly #editingPlanService = inject(EditingPlanService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  isDraftMode = input<boolean>(false);

  readonly #state = signal<ComponentState>('loading');
  readonly #planId = signal<number | null>(null);
  readonly #availableTags = signal<AvailableTags | null>(null);
  readonly #planTags = signal<PlanTags | null>(null);
  readonly #taxonomySelections = signal<Map<number, SelectOption[]>>(new Map());
  readonly #customLabelSelections = signal<Map<string, SelectOption[]>>(new Map());
  readonly #touchedControls = signal<Set<string>>(new Set());
  readonly #isSaving = signal<boolean>(false);
  #form = new FormGroup({} as Record<string, FormControl<SelectOption[]>>);
  #loadRequestId = 0;

  readonly saved = output<void>();
  readonly saveFailed = output<void>();

  readonly state = this.#state.asReadonly();
  readonly canEditPlan: Signal<boolean> = toSignal(this.#editingPlanService.observeCanEditPlan$(), { initialValue: false });
  readonly #planStatus = toSignal(this.#editingPlanService.getSelectedPlanDetail$().pipe(map(detail => detail?.data?.status ?? null)), {
    initialValue: null as PlanStatus | null,
  });
  readonly isPlanDraft = computed(() => this.isDraftMode() || this.#planStatus() === PlanStatus.DRAFT);
  readonly canManageTags = computed(() => this.#userService.hasPermission(Permissions.CAN_MANAGE_TAGS));
  readonly canSetTagsWhenCreatingPlan = computed(() => this.#userService.hasPermission(Permissions.CAN_SET_TAGS_WHEN_CREATING_PLAN));
  readonly canEditTags = computed(() =>
    this.isPlanDraft() ? this.canSetTagsWhenCreatingPlan() || this.canManageTags() : this.canManageTags(),
  );
  readonly effectiveCanEdit = computed(() => this.canEditTags() && this.canEditPlan());
  readonly #isDirty = computed(() => {
    const planTags = this.#planTags();
    const available = this.#availableTags();
    if (!planTags || !available) return false;

    const eqSets = (a: Set<number>, b: Set<number>) => a.size === b.size && [...a].every(id => b.has(id));
    const eqArrays = (a: number[], b: number[]) => a.length === b.length && a.every((id, index) => id === b[index]);

    const savedTaxonomyIds = new Set(planTags.taxonomies.flatMap(h => h.terms.map(t => t.id)));
    const currentTaxonomyIds = new Set([...this.#taxonomySelections().values()].flatMap(opts => opts.map(o => o.id as number)));

    const savedLabelIds = available.customLabels.flatMap(
      group => planTags.customLabels.find(savedGroup => savedGroup.type === group.type)?.labels.map(label => label.id) ?? [],
    );
    const currentLabelIds = available.customLabels.flatMap(group =>
      (this.#customLabelSelections().get(group.type) ?? []).map(option => option.id as number),
    );

    return !eqSets(savedTaxonomyIds, currentTaxonomyIds) || !eqArrays(savedLabelIds, currentLabelIds);
  });
  readonly canSave = computed(() => this.state() === 'ok' && this.effectiveCanEdit() && !this.#isSaving() && this.#isDirty());
  readonly taxonomySelectors = computed((): TaxonomySelectorModel[] => {
    const available = this.#availableTags();
    const planTags = this.#planTags();
    const selections = this.#taxonomySelections();
    const touchedControls = this.#touchedControls();
    if (!available || !planTags) return [];

    const hierarchiesOrdered = [...available.taxonomies].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return hierarchiesOrdered.map(hierarchy => {
      const assignedTaxonomy = planTags.taxonomies.find(t => t.id === hierarchy.id);
      const availableTermIds = new Set(hierarchy.terms.map(t => t.id));
      const orphanTerms: OrphanOption[] = (assignedTaxonomy?.terms ?? [])
        .filter(t => !availableTermIds.has(t.id))
        .map(t => ({ id: t.id, name: t.name }));

      const key = `taxonomy-${hierarchy.id}`;
      const control = this.#form.get(key);
      const isTouched = touchedControls.has(key);
      let error: string | null = null;
      if (isTouched && control?.hasError('maxLength')) {
        error = 'planEdition.tags.errorMaxExceeded';
      } else if (isTouched && control?.hasError('required')) {
        error = 'planEdition.tags.errorRequired';
      }

      return {
        displayLabel: hierarchy.required ? `${hierarchy.name} *` : hierarchy.name,
        error,
        hierarchy,
        options: mapTaxonomyTermsToOptions(hierarchy.terms, orphanTerms),
        selectedOptions: selections.get(hierarchy.id) ?? [],
      };
    });
  });

  readonly isEmpty = computed(() => this.taxonomySelectors().length === 0 && (this.#availableTags()?.customLabels.length ?? 0) === 0);

  readonly eventLabelSelector = computed((): CustomLabelSelectorModel | null => this.#buildCustomLabelSelector('event'));

  readonly marketingLabelSelector = computed((): CustomLabelSelectorModel | null => this.#buildCustomLabelSelector('marketing'));

  readonly orderedSelectors = computed((): OrderedSelectorModel[] => {
    const taxonomySelectors: OrderedSelectorModel[] = this.taxonomySelectors().map(selector => ({
      kind: 'taxonomy',
      selector,
      sortLabel: selector.hierarchy.name,
    }));

    const customLabelSelectors: OrderedSelectorModel[] = [];
    const eventSelector = this.eventLabelSelector();
    if (eventSelector) {
      customLabelSelectors.push({
        kind: 'customLabel',
        selector: eventSelector,
        sortLabel: this.#getCustomLabelDisplayLabel('event'),
        type: 'event',
      });
    }

    const marketingSelector = this.marketingLabelSelector();
    if (marketingSelector) {
      customLabelSelectors.push({
        kind: 'customLabel',
        selector: marketingSelector,
        sortLabel: this.#getCustomLabelDisplayLabel('marketing'),
        type: 'marketing',
      });
    }

    const allSelectors = [...taxonomySelectors, ...customLabelSelectors];
    const sortAlphabetically = (a: OrderedSelectorModel, b: OrderedSelectorModel) =>
      a.sortLabel.localeCompare(b.sortLabel, undefined, { sensitivity: 'base' });
    const requiredSelectors = allSelectors
      .filter((selector): selector is TaxonomyOrderedSelectorModel => selector.kind === 'taxonomy' && selector.selector.hierarchy.required)
      .sort(sortAlphabetically);
    const optionalSelectors = allSelectors
      .filter(selector => selector.kind === 'customLabel' || !selector.selector.hierarchy.required)
      .sort(sortAlphabetically);

    return [...requiredSelectors, ...optionalSelectors];
  });
  readonly requiredSelectors = computed(() =>
    this.orderedSelectors().filter(
      (selector): selector is TaxonomyOrderedSelectorModel => selector.kind === 'taxonomy' && selector.selector.hierarchy.required,
    ),
  );
  readonly optionalSelectors = computed(() =>
    this.orderedSelectors().filter(selector => selector.kind === 'customLabel' || !selector.selector.hierarchy.required),
  );
  readonly requiredSelectorsCount = computed(() => this.requiredSelectors().length);
  readonly optionalSelectorsCount = computed(() => this.optionalSelectors().length);

  ngOnInit(): void {
    this.#editingPlanService
      .getSelectedPlanOption$()
      .pipe(
        switchMap(option => this.#loadSelectedPlan(option?.id ?? null)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  areChangesUnsaved(): boolean {
    return this.#isDirty();
  }

  onEventLabelsSelected(options: SelectOption[]): void {
    this.#customLabelSelections.update(map => new Map(map).set('event', options));
    this.#form.get(`event`)?.setValue(options);
    this.#markControlTouched('event');
  }

  onMarketingLabelsSelected(options: SelectOption[]): void {
    this.#customLabelSelections.update(map => new Map(map).set('marketing', options));
    this.#form.get(`marketing`)?.setValue(options);
    this.#markControlTouched('marketing');
  }

  onTaxonomyBlurred(hierarchyId: number, event: TypeaheadEvent): void {
    this.#markControlTouched(`taxonomy-${hierarchyId}`);
    if (typeof event.selectedOption === 'string') {
      const key = `taxonomy-${hierarchyId}`;
      this.#taxonomySelections.update(map => new Map(map).set(hierarchyId, []));
      this.#form.get(key)?.setValue([]);
    }
  }

  onTaxonomyMultiSelected(hierarchyId: number, options: SelectOption[]): void {
    this.#taxonomySelections.update(map => new Map(map).set(hierarchyId, options));
    this.#form.get(`taxonomy-${hierarchyId}`)?.setValue(options);
    this.#markControlTouched(`taxonomy-${hierarchyId}`);
  }

  onTaxonomySelected(hierarchyId: number, option: SelectOption | undefined): void {
    const value = option ? [option] : [];
    this.#taxonomySelections.update(map => new Map(map).set(hierarchyId, value));
    this.#form.get(`taxonomy-${hierarchyId}`)?.setValue(value);
    this.#markControlTouched(`taxonomy-${hierarchyId}`);
  }

  retry(): void {
    this.#loadSelectedPlan(this.#planId()).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  save(): void {
    if (!this.canSave()) return;

    this.#markAllTouched();

    if (!this.#form.valid) {
      this.#toastService.add({
        autoHide: true,
        message: this.#translateService.instant('planSettings.errors.requiredFields'),
        sentiment: AlertSentiment.danger,
      });
      this.saveFailed.emit();
      return;
    }

    const partner = this.#partnerService.getPartner();
    const planId = this.#planId();

    if (!partner?.id || !planId) {
      this.saveFailed.emit();
      return;
    }

    this.#isSaving.set(true);
    const requestId = this.#loadRequestId;
    const savedTags = this.#buildSavedTags();
    this.#tagsService
      .updatePlanTags(partner.id, planId, this.#buildPayload())
      .pipe(
        tap(() => {
          if (requestId !== this.#loadRequestId) return;
          this.#planTags.set(savedTags);
          this.#showSaveToast('planEdition.toast.changesSaved', AlertSentiment.positive);
          this.saved.emit();
        }),
        catchError(() => {
          if (requestId === this.#loadRequestId) {
            this.#showSaveToast('planEdition.toast.tagsSaveError', AlertSentiment.danger);
            this.saveFailed.emit();
          }
          return EMPTY;
        }),
        finalize(() => {
          if (requestId === this.#loadRequestId) this.#isSaving.set(false);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #showSaveToast(messageKey: string, sentiment: AlertSentiment): void {
    if (this.isDraftMode() && sentiment === AlertSentiment.positive) return;
    this.#toastService.add({
      autoHide: true,
      delay: sentiment === AlertSentiment.positive ? 3000 : 5000,
      message: this.#translateService.instant(messageKey),
      sentiment,
    });
  }

  #buildCustomLabelSelector(groupType: CustomLabelType): CustomLabelSelectorModel | null {
    const available = this.#availableTags();
    const planTags = this.#planTags();
    const selections = this.#customLabelSelections();
    if (!available) return null;

    const group = available.customLabels.find(g => g.type === groupType);
    if (!group) return null;

    const assignedGroup = planTags?.customLabels.find(g => g.type === groupType);
    const availableLabelIds = new Set(group.labels.map(l => l.id));
    const orphanLabels: OrphanOption[] = (assignedGroup?.labels ?? [])
      .filter(l => !availableLabelIds.has(l.id))
      .map(l => ({ id: l.id, name: l.text }));

    const control = this.#form.get(groupType);
    const isTouched = this.#touchedControls().has(groupType);
    const error: string | null = isTouched && control?.hasError('maxLength') ? 'planEdition.tags.errorMaxExceeded' : null;

    return {
      error,
      maxLabelsPerPlan: group.maxLabelsPerPlan,
      options: mapCustomLabelsToOptions(group.labels, orphanLabels),
      selectedOptions: selections.get(groupType) ?? [],
    };
  }

  #getCustomLabelDisplayLabel(groupType: CustomLabelType): string {
    if (groupType === 'event') return this.#translateService.instant('planEdition.tags.eventTag');
    return this.#translateService.instant('planEdition.tags.marketingTag');
  }

  #buildForm(available: AvailableTags, initialTaxonomy: Map<number, SelectOption[]>, initialCustom: Map<string, SelectOption[]>): void {
    const controls: Record<string, FormControl<SelectOption[]>> = {};

    for (const hierarchy of available.taxonomies) {
      const validators: ValidatorFn[] = [];
      if (hierarchy.required) validators.push(Validators.required);
      if (hierarchy.maxTermsPerPlan !== null) validators.push(maxArrayLengthValidator(hierarchy.maxTermsPerPlan));
      controls[`taxonomy-${hierarchy.id}`] = new FormControl<SelectOption[]>(initialTaxonomy.get(hierarchy.id) ?? [], {
        nonNullable: true,
        validators,
      });
    }

    for (const group of available.customLabels) {
      const validators: ValidatorFn[] = [];
      if (group.maxLabelsPerPlan !== null) validators.push(maxArrayLengthValidator(group.maxLabelsPerPlan));
      controls[group.type] = new FormControl<SelectOption[]>(initialCustom.get(group.type) ?? [], { nonNullable: true, validators });
    }

    this.#form = new FormGroup(controls);
  }

  #buildInitialCustomLabelSelections(available: AvailableTags, planTags: PlanTags): Map<string, SelectOption[]> {
    const map = new Map<string, SelectOption[]>();

    for (const group of available.customLabels) {
      const assignedGroup = planTags.customLabels.find(g => g.type === group.type);
      if (!assignedGroup) {
        map.set(group.type, []);
        continue;
      }

      const availableLabelMap = new Map(group.labels.map(l => [l.id, l.text]));
      map.set(
        group.type,
        assignedGroup.labels.map(label => ({
          disabled: !availableLabelMap.has(label.id),
          id: label.id,
          title: availableLabelMap.get(label.id) ?? label.text,
        })),
      );
    }

    return map;
  }

  #buildInitialTaxonomySelections(available: AvailableTags, planTags: PlanTags): Map<number, SelectOption[]> {
    const map = new Map<number, SelectOption[]>();

    for (const hierarchy of available.taxonomies) {
      const assignedTaxonomy = planTags.taxonomies.find(t => t.id === hierarchy.id);
      if (!assignedTaxonomy) {
        map.set(hierarchy.id, []);
        continue;
      }

      const availableTermMap = new Map(hierarchy.terms.map(t => [t.id, t.name]));
      map.set(
        hierarchy.id,
        assignedTaxonomy.terms.map(term => ({
          disabled: !availableTermMap.has(term.id),
          id: term.id,
          title: availableTermMap.get(term.id) ?? term.name,
        })),
      );
    }

    return map;
  }

  #buildPayload(): UpdatePlanTags {
    const available = this.#availableTags()!;
    const taxonomyTermIds = available.taxonomies.flatMap(hierarchy =>
      (this.#taxonomySelections().get(hierarchy.id) ?? []).map(opt => opt.id as number),
    );
    const customLabelIds = available.customLabels.flatMap(group =>
      (this.#customLabelSelections().get(group.type) ?? []).map(opt => opt.id as number),
    );
    return { customLabelIds, taxonomyTermIds };
  }

  #buildSavedTags(): PlanTags {
    const available = this.#availableTags();
    if (!available) return { customLabels: [], taxonomies: [] };

    return {
      customLabels: available.customLabels.map(group => ({
        labels: (this.#customLabelSelections().get(group.type) ?? []).map(option => ({ id: option.id as number, text: option.title })),
        maxLabelsPerPlan: group.maxLabelsPerPlan,
        type: group.type,
      })),
      taxonomies: available.taxonomies.map(hierarchy => ({
        id: hierarchy.id,
        name: hierarchy.name,
        terms: (this.#taxonomySelections().get(hierarchy.id) ?? []).map(option => ({ id: option.id as number, name: option.title })),
      })),
    };
  }

  #loadSelectedPlan(planId: number | null): Observable<unknown> {
    this.#loadRequestId += 1;
    this.#planId.set(planId);
    this.#resetEditionState();

    if (!planId) {
      this.#state.set('error');
      return of(null);
    }

    return this.#loadData(planId);
  }

  #resetEditionState(): void {
    this.#state.set('loading');
    this.#isSaving.set(false);
    this.#availableTags.set(null);
    this.#planTags.set(null);
    this.#taxonomySelections.set(new Map());
    this.#customLabelSelections.set(new Map());
    this.#touchedControls.set(new Set());
    this.#form = new FormGroup({} as Record<string, FormControl<SelectOption[]>>);
  }

  #loadData(planId: number): Observable<unknown> {
    const partner = this.#partnerService.getPartner();

    if (!partner) {
      this.#state.set('error');
      return of(null);
    }

    const requestId = ++this.#loadRequestId;

    return forkJoin({
      available: this.#tagsService.getAvailableTags(partner.id),
      planTags: this.#tagsService.getPlanTags(partner.id, planId),
    }).pipe(
      tap(result => {
        if (requestId !== this.#loadRequestId) return;

        const taxonomySelections = this.#buildInitialTaxonomySelections(result.available, result.planTags);
        const customLabelSelections = this.#buildInitialCustomLabelSelections(result.available, result.planTags);

        this.#availableTags.set(result.available);
        this.#planTags.set(result.planTags);
        this.#taxonomySelections.set(taxonomySelections);
        this.#customLabelSelections.set(customLabelSelections);
        this.#buildForm(result.available, taxonomySelections, customLabelSelections);
        this.#state.set('ok');
      }),
      catchError(() => {
        if (requestId === this.#loadRequestId) this.#state.set('error');
        return of(null);
      }),
    );
  }

  #markAllTouched(): void {
    const available = this.#availableTags();
    if (!available) return;
    for (const hierarchy of available.taxonomies) {
      this.#markControlTouched(`taxonomy-${hierarchy.id}`);
    }
    for (const group of available.customLabels) {
      this.#markControlTouched(group.type);
    }
  }

  #markControlTouched(key: string): void {
    this.#form.get(key)?.markAsTouched();
    this.#touchedControls.update(set => new Set([...set, key]));
  }
}
