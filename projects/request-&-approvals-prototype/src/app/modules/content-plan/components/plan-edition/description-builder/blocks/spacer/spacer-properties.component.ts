import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { BlockOf, SpacerProps } from '../../models/block.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [TranslateModule],
  selector: 'app-db-spacer-properties',
  standalone: true,
  styleUrl: './spacer-properties.component.scss',
  templateUrl: './spacer-properties.component.html',
})
export class SpacerPropertiesComponent {
  readonly block = input.required<BlockOf<'spacer'>>();
  readonly disabled = input<boolean>(false);
  readonly propsChange = output<SpacerProps>();

  spacerSize(): number {
    return this.block().props.size;
  }

  onSpacerChange(value: string): void {
    this.propsChange.emit({ ...this.block().props, size: parseInt(value, 10) });
  }
}
