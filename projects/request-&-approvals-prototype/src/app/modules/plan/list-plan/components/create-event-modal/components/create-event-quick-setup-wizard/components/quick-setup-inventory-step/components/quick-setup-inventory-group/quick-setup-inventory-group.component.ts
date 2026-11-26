import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, ReactiveFormsModule } from '@angular/forms';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntDividerComponent } from '@ignite/legacy/components/ignt-divider/ignt-divider.component';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { map, startWith, switchMap } from 'rxjs/operators';

import { QuickSetupInventoryGroupForm, QuickSetupInventoryItemForm } from '../../../../../../models/quick-setup-inventory.model';
import { QuickSetupInventoryDropHintComponent } from '../quick-setup-inventory-drop-hint/quick-setup-inventory-drop-hint.component';
import { QuickSetupInventoryRowKind } from '../quick-setup-inventory-row/quick-setup-inventory-row-kind.enum';
import { QuickSetupInventoryRowComponent } from '../quick-setup-inventory-row/quick-setup-inventory-row.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDrag,
    CdkDropList,
    IgntButtonComponent,
    IgntDividerComponent,
    IgntFieldErrorComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    QuickSetupInventoryDropHintComponent,
    QuickSetupInventoryRowComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-quick-setup-inventory-group',
  styleUrl: './quick-setup-inventory-group.component.scss',
  templateUrl: './quick-setup-inventory-group.component.html',
})
export class QuickSetupInventoryGroupComponent {
  static readonly reducedMotionQuery = '(prefers-reduced-motion: reduce)';

  readonly #document = inject(DOCUMENT);
  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly group = input.required<QuickSetupInventoryGroupForm>();
  readonly index = input.required<number>();
  readonly neededSessionTypeOptionsByTicket = input.required<ReadonlyMap<QuickSetupInventoryItemForm, SelectOption[]>>();
  readonly ticketIndexes = input.required<ReadonlyMap<QuickSetupInventoryItemForm, number>>();
  readonly canDeleteTicket = input(true);
  readonly currency = input<string | null>(null);
  readonly isNew = input(false);
  readonly isPricesByTier = input(false);
  readonly productTypeOptions = input<SelectOption[]>([]);
  readonly revealErrorsRequest = input(0);
  readonly deleted = output<void>();
  readonly ticketAdded = output<void>();
  readonly ticketDeleted = output<QuickSetupInventoryItemForm>();
  readonly ticketDropped = output<CdkDragDrop<FormArray<QuickSetupInventoryItemForm>>>();

  readonly #groupState = toSignal(
    toObservable(this.group).pipe(
      switchMap(group =>
        group.events.pipe(
          startWith(null),
          map(() => ({
            isEmpty: group.hasError('groupWithoutTickets'),
            name: group.controls.name.value,
            productCount: group.controls.tickets.length,
          })),
        ),
      ),
    ),
  );
  readonly #isExpanded = linkedSignal<number, boolean>({
    source: this.revealErrorsRequest,
    computation: (_request, previous) => previous === undefined || previous.value || this.group().invalid,
  });

  protected readonly isEmptyGroupError = computed(() => this.revealErrorsRequest() > 0 && this.#groupState()?.isEmpty === true);
  protected readonly isExpanded = this.#isExpanded.asReadonly();
  protected readonly nameErrorParams = computed(() => ({ value: this.#groupState()?.name ?? '' }));
  protected readonly productCountKey = computed(() =>
    this.#groupState()?.productCount === 1
      ? 'createEvent.quickSetupWizard.step2.productCountOne'
      : 'createEvent.quickSetupWizard.step2.productCountOther',
  );
  protected readonly productCountParams = computed(() => ({ count: this.#groupState()?.productCount ?? 0 }));
  protected readonly rowKind = QuickSetupInventoryRowKind;

  constructor() {
    afterNextRender(() => {
      if (this.isNew()) {
        this.#elementRef.nativeElement.scrollIntoView({ behavior: this.#scrollBehavior(), block: 'nearest' });
      }
    });
  }

  protected toggle(): void {
    this.#isExpanded.update(isExpanded => !isExpanded);
  }

  #scrollBehavior(): ScrollBehavior {
    return this.#document.defaultView?.matchMedia(QuickSetupInventoryGroupComponent.reducedMotionQuery).matches === true
      ? 'auto'
      : 'smooth';
  }
}
