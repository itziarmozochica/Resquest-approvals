import { ChangeDetectionStrategy, Component, computed, input, InputSignal, output, OutputEmitterRef, Signal } from '@angular/core';

import { IgntButtonComponent, IgntPillButtonComponent } from '@ignite/common';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

import { PartnerChannel } from '../../../models/partner-channels.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntPillButtonComponent, IgntTagComponent, TranslateModule],
  selector: 'app-content-channel-selector',
  standalone: true,
  styleUrl: './content-channel-selector.component.scss',
  templateUrl: './content-channel-selector.component.html',
})
export class ContentChannelSelectorComponent {
  readonly channels: InputSignal<readonly PartnerChannel[]> = input<readonly PartnerChannel[]>([]);
  /** Created channels for the plan — rendered as pills after the default one. */
  readonly activeChannelIds: InputSignal<readonly string[]> = input<readonly string[]>([]);
  readonly selectedChannelId: InputSignal<string> = input<string>('');
  readonly canEditPlan: InputSignal<boolean> = input<boolean>(true);
  readonly channelSelected: OutputEmitterRef<string> = output<string>();
  readonly channelRemoveClick: OutputEmitterRef<string> = output<string>();
  readonly addChannelClick: OutputEmitterRef<void> = output<void>();

  /**
   * Created channels, de-duplicated and sorted, rendered after the default pill.
   * Intersected with the catalog so a stale id never shows up as a raw-id pill.
   */
  protected readonly channelIds: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const known: ReadonlySet<string> = new Set<string>(this.channels().map((channel: PartnerChannel) => channel.id));
    return Array.from(new Set(this.activeChannelIds()))
      .filter((id: string) => known.has(id))
      .sort();
  });

  protected getChannelName(channelId: string): string {
    return this.channels().find(channel => channel.id === channelId)?.name ?? channelId;
  }

  protected selectChannel(channelId: string): void {
    if (channelId === this.selectedChannelId()) {
      return;
    }
    this.channelSelected.emit(channelId);
  }

  protected removeChannel(channelId: string): void {
    this.channelRemoveClick.emit(channelId);
  }
}
