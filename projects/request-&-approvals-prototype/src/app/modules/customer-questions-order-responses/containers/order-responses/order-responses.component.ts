import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { ActionsBarComponent } from '@fz-original/app/shared/components/actions-bar/actions-bar.component';
import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';
import { getWhenFormTitleKey } from '@fz-original/app/shared/main-plan-questions/utils/main-plan-question-labels.util';
import { WithUnsavedChangesGuardComponent } from '@fz-original/app/shared/models/with-unsaved-changes-guard-component.model';
import { IgntBreadcrumbComponent, IgntBreadcrumbItem, IgntToastService } from '@ignite/common';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { distinctUntilChanged, map, Subscription } from 'rxjs';

import { OrderResponsesSectionComponent } from '../../components/order-responses-section/order-responses-section.component';
import { OrderResponsesSummaryComponent } from '../../components/order-responses-summary/order-responses-summary.component';
import { OrderResponsesSummary } from '../../models/order-responses-summary.model';
import { OrderResponseSection, OrderResponsesView } from '../../models/order-responses-view.model';
import { OrderResponsesFacade } from '../../services/order-responses.facade';
import { buildOrderResponsesView } from '../../utils/build-order-responses-view.util';
import { buildSectionControls, isSectionSavable, OrderResponseControls, toOrderAnswersInput } from '../../utils/order-responses-form.util';
import { getTicketSessionTypeIds, toOrderResponsesSummary } from '../../utils/order-responses-summary.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ActionsBarComponent,
    IgntBreadcrumbComponent,
    IgntSkeletonComponent,
    OrderResponsesSectionComponent,
    OrderResponsesSummaryComponent,
    TranslateModule,
  ],
  selector: 'app-order-responses',
  styleUrl: './order-responses.component.scss',
  templateUrl: './order-responses.component.html',
})
export class OrderResponsesComponent implements WithUnsavedChangesGuardComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);
  readonly #facade = inject(OrderResponsesFacade);
  readonly #injector = inject(Injector);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #toast = inject(IgntToastService);
  readonly #translate = inject(TranslateService);

  readonly #shownOrderId = signal<number>(Number(this.#route.snapshot.paramMap.get('orderId')));
  #fragment = this.#route.snapshot.fragment;

  get #orderId(): number {
    return this.#shownOrderId();
  }

  protected readonly editingWhen = signal<QuestionWhen | null>(null);
  protected readonly saving = signal<boolean>(false);
  protected readonly summary = signal<OrderResponsesSummary | null>(null);
  protected readonly view = signal<OrderResponsesView | null>(null);
  protected readonly anchorWhen = computed<QuestionWhen | null>(
    () => this.view()?.sections.find(section => section.frequencies.some(frequency => (frequency.tickets?.length ?? 0) > 0))?.when ?? null,
  );

  readonly #controls = signal<OrderResponseControls | null>(null);
  readonly #formState = signal<{ dirty: boolean; valid: boolean }>({ dirty: false, valid: true });
  #editSubscription: Subscription | null = null;
  #loadSubscription: Subscription | null = null;
  #screensShown = 0;
  readonly #answersAreCurrent = signal(true);
  #destroyed = false;

  protected readonly canEdit = computed<boolean>(() => this.#facade.canModifyAnswers && this.#answersAreCurrent());
  protected readonly canSave = computed<boolean>(() => !this.saving() && this.#formState().dirty && this.#formState().valid);
  protected readonly controls = computed<OrderResponseControls | null>(() => this.#controls());

  protected readonly breadcrumbItems = computed<IgntBreadcrumbItem[]>(() => [
    { label: String(this.#translate.instant('orderResponses.breadcrumb.validation')), routerLink: ['/validation'], type: 'router' },
    {
      label: this.summary()?.reference ?? '',
      queryParams: { id: this.#orderId, type: 'order' },
      routerLink: ['/validation'],
      type: 'router',
    },
    { label: String(this.#translate.instant('orderResponses.title')), type: 'label' },
  ]);

  #scrolled = false;

  constructor() {
    this.#destroyRef.onDestroy(() => (this.#destroyed = true));
    this.#route.paramMap
      .pipe(
        map(params => Number(params.get('orderId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(orderId => this.#showOrder(orderId));
  }

  #scrollToFragment(): void {
    const fragment = this.#fragment;
    if (fragment === null || this.#scrolled) {
      return;
    }

    this.#scrolled = true;

    afterNextRender(() => this.#document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), {
      injector: this.#injector,
    });
  }

  areChangesUnsaved(): boolean {
    return !this.saving() && this.editingWhen() !== null && this.#formState().dirty;
  }

  protected isEditing(section: OrderResponseSection): boolean {
    return this.editingWhen() === section.when;
  }

  protected onCancel(): void {
    if (this.saving()) {
      return;
    }

    if (!this.#answersAreCurrent()) {
      this.#load({
        evictOnError: false,
        onSettled: loaded => {
          if (loaded) {
            this.#stopEditing();
          }
        },
      });

      return;
    }

    this.#stopEditing();
  }

  protected onEdit(section: OrderResponseSection): void {
    if (this.isEditing(section) || this.saving()) {
      return;
    }

    this.#stopEditing();

    const controls = buildSectionControls(section);
    this.#controls.set(controls);
    this.editingWhen.set(section.when);
    this.#editSubscription = new Subscription();
    controls.forEach(control =>
      this.#editSubscription?.add(
        control.valueChanges
          .pipe(takeUntilDestroyed(this.#destroyRef))
          .subscribe(() => this.#formState.set(this.#readFormState(section, controls))),
      ),
    );
    this.#formState.set(this.#readFormState(section, controls));
  }

  protected onSave(): void {
    const when = this.editingWhen();
    const controls = this.#controls();
    const section = this.view()?.sections.find(candidate => candidate.when === when);
    if (!when || !controls || !section || this.saving()) {
      return;
    }

    const screen = this.#screensShown;
    this.saving.set(true);
    controls.forEach(control => control.disable({ emitEvent: false }));
    this.#facade.saveSection(this.#orderId, when, toOrderAnswersInput(section, controls)).subscribe({
      error: () => {
        this.#toast.danger(String(this.#translate.instant('orderResponses.toasts.saveError')));
        if (this.#isGone(screen)) {
          return;
        }

        this.saving.set(false);
        controls.forEach(control => control.enable({ emitEvent: false }));
      },
      next: () => {
        this.#toast.positive(
          String(this.#translate.instant('orderResponses.toasts.saved', { form: this.#translate.instant(getWhenFormTitleKey(when)) })),
        );
        if (this.#isGone(screen)) {
          return;
        }

        this.#formState.set({ dirty: false, valid: true });
        this.#load({
          evictOnError: false,
          onSettled: loaded => {
            if (loaded && this.editingWhen() === when) {
              this.#stopEditing();
            }
            this.saving.set(false);
          },
        });
      },
    });
  }

  /** The router reuses this screen when only the order changes, so a snapshot id would keep loading the previous one. */
  #showOrder(orderId: number): void {
    this.#screensShown++;
    this.#stopEditing();
    this.saving.set(false);
    this.#shownOrderId.set(orderId);
    this.#fragment = this.#route.snapshot.fragment;
    this.summary.set(null);
    this.view.set(null);
    this.#scrolled = false;
    this.#load();
  }

  #load({ evictOnError, onSettled }: { evictOnError: boolean; onSettled?: (loaded: boolean) => void } = { evictOnError: true }): void {
    this.#loadSubscription?.unsubscribe();
    this.#loadSubscription = this.#facade
      .load(this.#orderId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#answersAreCurrent.set(false);
          onSettled?.(false);
          this.#toast.danger(String(this.#translate.instant('orderResponses.toasts.loadError')));
          if (evictOnError) {
            void this.#router.navigate(['/validation']);
          }
        },
        next: ({ answers, mainPlanQuestions, order }) => {
          const summary = toOrderResponsesSummary(order);
          this.summary.set(summary);
          const ticketSessionTypeIds = getTicketSessionTypeIds(order);
          this.view.set(
            buildOrderResponsesView({
              answers,
              mainPlanQuestions,
              ticketCount: ticketSessionTypeIds.length > 0 ? ticketSessionTypeIds.length : summary.ticketCount,
              ticketSessionTypeIds,
            }),
          );
          this.#answersAreCurrent.set(true);
          onSettled?.(true);
          this.#scrollToFragment();
        },
      });
  }

  #readFormState(section: OrderResponseSection, controls: OrderResponseControls): { dirty: boolean; valid: boolean } {
    return {
      dirty: [...controls.values()].some(control => control.dirty),
      valid: isSectionSavable(section, controls),
    };
  }

  /** Counting screens, not order ids, so leaving an order and coming back is a new form the earlier save cannot touch. */
  #isGone(screen: number): boolean {
    return this.#destroyed || screen !== this.#screensShown;
  }

  #stopEditing(): void {
    this.#editSubscription?.unsubscribe();
    this.#editSubscription = null;
    this.#controls.set(null);
    this.editingWhen.set(null);
    this.#formState.set({ dirty: false, valid: true });
  }
}
