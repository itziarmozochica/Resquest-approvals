import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { TypeaheadComponent } from '@fz-original/app/shared/layout/filters/typeahead/typeahead.component';
// eslint-disable-next-line no-restricted-imports -- Extending TypeaheadComponent which uses ng-bootstrap
import { NgbHighlight, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

export interface TierOption extends SelectOption {
  color?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconsModule, NgbHighlight, NgbTypeaheadModule, NgIf],
  selector: 'app-tier-typeahead',
  standalone: true,
  styleUrls: ['./tier-typeahead.component.scss'],
  templateUrl: './tier-typeahead.component.html',
})
export class TierTypeaheadComponent extends TypeaheadComponent {
  get selectedTierColor(): string | undefined {
    if (this.model != null && typeof this.model === 'object') {
      return (this.model as TierOption).color;
    }
    return undefined;
  }

  @Input() override options: TierOption[] = [];

  isOptionSelected(option: TierOption): boolean {
    return this.model != null && typeof this.model === 'object' && (this.model as SelectOption).id === option.id;
  }
}
