import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';

import type { FztPartyMemberCounterVm, FztPartyMemberQuantityChange } from '../../models/party-date-panel-vm.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconButtonComponent],
  selector: 'fzt-party-member-counter',
  styleUrl: './party-member-counter.component.scss',
  templateUrl: './party-member-counter.component.html',
})
export class FztPartyMemberCounterComponent {
  static readonly digitsPattern = /^[0-9]*$/u;
  static readonly memberPlaceholder = '{{member}}';
  /** Three digits cover any real group; a longer typo would otherwise ask for thousands of tickets. */
  static readonly quantityMaxDigits = 3;
  protected readonly quantityMaxDigits = FztPartyMemberCounterComponent.quantityMaxDigits;
  readonly decreaseAriaLabel = input.required<string>();
  readonly increaseAriaLabel = input.required<string>();
  readonly member = input.required<FztPartyMemberCounterVm>();
  readonly quantityChanged = output<FztPartyMemberQuantityChange>();

  protected readonly decreaseLabel = computed<string>(() =>
    this.decreaseAriaLabel().replace(FztPartyMemberCounterComponent.memberPlaceholder, this.member().name),
  );
  protected readonly increaseLabel = computed<string>(() =>
    this.increaseAriaLabel().replace(FztPartyMemberCounterComponent.memberPlaceholder, this.member().name),
  );

  protected onBeforeInput(event: InputEvent): void {
    if (event.data !== null && !FztPartyMemberCounterComponent.digitsPattern.test(event.data)) {
      event.preventDefault();
    }
  }

  protected onDecrease(): void {
    const member = this.member();

    if (!member.canDecrease) {
      return;
    }

    this.quantityChanged.emit({ memberKey: member.key, quantity: member.quantity - 1 });
  }

  protected onIncrease(): void {
    const member = this.member();

    this.quantityChanged.emit({ memberKey: member.key, quantity: member.quantity + 1 });
  }

  /**
   * Commits a typed quantity on blur or Enter, so one group size raises one change instead of one per keystroke.
   * Enter is default-prevented in the template, so a host sheet does not also take it as its primary action.
   */
  protected onQuantityTyped(field: HTMLInputElement): void {
    const member = this.member();
    const parsed = Number.parseInt(field.value, 10);
    const quantity = Number.isNaN(parsed) ? 0 : parsed;

    // The bound value only re-renders when the quantity changes, so the field is normalised by hand ("" or "07").
    field.value = quantity.toString();

    if (quantity !== member.quantity) {
      this.quantityChanged.emit({ memberKey: member.key, quantity });
    }
  }
}
