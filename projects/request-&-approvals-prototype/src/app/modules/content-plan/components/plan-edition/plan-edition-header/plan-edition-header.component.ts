import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, TemplateRef } from '@angular/core';

import { IconsModule } from '../../../../../shared/icons/icons.module';
import { IconDefinition, PlanEditionHeaderRequeriment } from '../../../models/plan-edition-header-requeriment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconsModule],
  selector: 'app-plan-edition-header',
  standalone: true,
  styleUrls: ['./plan-edition-header.component.scss'],
  templateUrl: './plan-edition-header.component.html',
})
export class PlanEditionHeaderComponent {
  @Input() requeriments: Array<PlanEditionHeaderRequeriment> = [];
  @Input() title!: string;
  @Input() linkTemplate!: TemplateRef<unknown>;

  getIconAsLayered(definition: IconDefinition | Array<IconDefinition>): Array<IconDefinition> {
    return this.isLayeredIcon(definition) ? definition : [definition];
  }

  private isLayeredIcon(definition: IconDefinition | Array<IconDefinition>): definition is Array<IconDefinition> {
    return definition && typeof definition?.[0] !== 'string';
  }
}
