import { ChangeDetectionStrategy, Component, computed, input, output, Signal } from '@angular/core';

import { IgntButtonComponent, IgntButtonIcon } from '@ignite/common';
import { IgntIconComponent, IgntIconName, IgntIconVariant } from '@ignite/icon';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import {
  DIAGNOSE_STATUS_PRESENTATION,
  DiagnoseStatus,
  DiagnoseStatusPresentation,
  DiagnoseTileAction,
  DiagnoseTileDetail,
} from '../../models/auto-diagnose.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-status]': 'status()',
    class: 'diagnose-tile',
  },
  imports: [IgntButtonComponent, IgntIconComponent, IgntTagComponent, TranslateModule],
  selector: 'app-diagnose-tile',
  styleUrl: './diagnose-tile.component.scss',
  templateUrl: './diagnose-tile.component.html',
})
export class DiagnoseTileComponent {
  readonly icon = input.required<IgntIconName>();
  readonly status = input.required<DiagnoseStatus>();
  readonly tileTitle = input.required<string>();
  readonly action = input<DiagnoseTileAction | null>(null);
  readonly actionDisabled = input<boolean>(false);
  readonly details = input<DiagnoseTileDetail[]>([]);
  readonly iconVariant = input<IgntIconVariant>('light');
  readonly summary = input<string>('');

  readonly actionClicked = output<void>();

  protected readonly actionIcon: Signal<IgntButtonIcon | undefined> = computed(() => {
    const icon: IgntIconName | undefined = this.action()?.icon;

    return icon === undefined ? undefined : { name: icon, variant: 'solid' };
  });
  protected readonly presentation: Signal<DiagnoseStatusPresentation> = computed(() => DIAGNOSE_STATUS_PRESENTATION[this.status()]);
  protected readonly isTesting: Signal<boolean> = computed(() => this.status() === DiagnoseStatus.testing);
}
