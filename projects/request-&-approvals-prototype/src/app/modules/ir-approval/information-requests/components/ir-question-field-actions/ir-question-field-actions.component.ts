import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { IgntButtonComponent, IgntPillButtonComponent } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { InformationRequestQuestion } from '../../models/information-request-question.model';
import {
  effectiveRequired,
  IrFieldAction,
  IrFieldEditingState,
  isRemovable,
  isRequiredLocked,
  removalBlockedKey,
} from '../../models/ir-field-editing.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntButtonComponent, IgntIconButtonComponent, IgntPillButtonComponent],
  selector: 'app-ir-question-field-actions',
  standalone: true,
  styleUrls: ['./ir-question-field-actions.component.scss'],
  templateUrl: './ir-question-field-actions.component.html',
})
export class IrQuestionFieldActionsComponent {
  readonly question = input.required<InformationRequestQuestion>();
  readonly state = input.required<IrFieldEditingState>();

  readonly action = output<IrFieldAction>();

  readonly removeIcon: IconProp = ['fal', 'trash-can'];

  readonly pendingRemoval = computed<boolean>(() => this.state().pendingRemove.includes(this.question().id));
  readonly required = computed<boolean>(() => effectiveRequired(this.question(), this.state()));
  readonly requiredLocked = computed<boolean>(() => isRequiredLocked(this.question(), this.state()));
  readonly removable = computed<boolean>(() => isRemovable(this.question(), this.state()));
  readonly blockedKey = computed<string | null>(() => removalBlockedKey(this.question(), this.state()));

  setRequired(required: boolean): void {
    this.action.emit({ questionId: this.question().id, required, type: 'required' });
  }

  remove(): void {
    this.action.emit({ questionId: this.question().id, type: 'remove' });
  }

  undoRemove(): void {
    this.action.emit({ questionId: this.question().id, type: 'undoRemove' });
  }
}
