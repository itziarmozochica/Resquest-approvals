import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, input, Output } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { ProgressBarComponent } from '../../../../../shared/components/progress-bar/progress-bar.component';
import { UserService } from '../../../../../shared/services/user/user.service';
import { CardItem, SetupCard } from '../plan-setup/plan-setup.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IgntButtonComponent, IgntIconComponent, IgntWrapperCardComponent, ProgressBarComponent, TranslateModule],
  selector: 'app-setup-card',
  standalone: true,
  styleUrls: ['./setup-card.component.scss'],
  templateUrl: './setup-card.component.html',
})
export class SetupCardComponent {
  #userService = inject(UserService);

  @Output() buttonClick = new EventEmitter<void>();
  buttonSentiment = computed<'primary' | 'secondary'>(() => this.#getButtonSentiment());
  buttonText = computed<string>(() => this.#getButtonText());
  card = input.required<SetupCard>();
  canEdit = input<boolean>(true);
  isCompleted = computed<boolean>(() => this.card().status === 'completed');
  isInProgress = computed<boolean>(() => this.card().status === 'in-progress');
  isProvisioning = input<boolean>(false);
  testIdPrefix = input<string>('setup-card');
  visibleItems = computed<CardItem[]>(() => {
    const cardData = this.card();
    const permittedItems = cardData.items.filter(item => !item.permission || this.#userService.hasPermission(item.permission));
    if (cardData.status === 'completed') {
      return permittedItems.filter(item => item.completed || item.optional);
    }
    return permittedItems;
  });

  getItemTestId(index: number, label: string): string {
    return `${this.testIdPrefix()}-item-${index}-${label.toLowerCase().replace(/[\s.]+/g, '-')}`;
  }

  onButtonClick(): void {
    this.buttonClick.emit();
  }

  #getButtonSentiment(): 'primary' | 'secondary' {
    if (!this.canEdit()) {
      return 'secondary';
    }
    return this.card().status === 'not-started' ? 'primary' : 'secondary';
  }

  #getButtonText(): string {
    if (!this.canEdit()) {
      return 'planSetup.buttons.view';
    }
    return this.card().status === 'not-started' ? 'planSetup.buttons.start' : 'planSetup.buttons.edit';
  }
}
