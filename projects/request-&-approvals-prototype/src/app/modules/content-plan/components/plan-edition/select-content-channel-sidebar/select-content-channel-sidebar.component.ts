import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { TranslateModule } from '@ngx-translate/core';

import { PartnerChannel } from '../../../models/partner-channels.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IgntButtonComponent, IgntIconComponent, IgntInputFieldComponent, IgntListItemComponent, TranslateModule],
  selector: 'app-select-content-channel-sidebar',
  standalone: true,
  styleUrls: ['./select-content-channel-sidebar.component.scss'],
  templateUrl: './select-content-channel-sidebar.component.html',
})
export class SelectContentChannelSidebarComponent {
  readonly availableChannels: InputSignal<readonly PartnerChannel[]> = input<readonly PartnerChannel[]>([]);
  /** Channels currently created for the plan — the initial selection to diff against. */
  readonly activeChannelIds: InputSignal<readonly string[]> = input<readonly string[]>([]);
  readonly channelsWithTranslations: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(new Set<string>());
  /** Drives the reseed and the search-term reset below. */
  readonly open: InputSignal<boolean> = input<boolean>(false);
  readonly saveChannels: OutputEmitterRef<{ added: string[]; removed: string[] }> = output<{ added: string[]; removed: string[] }>();
  readonly closeSidebar: OutputEmitterRef<void> = output<void>();

  protected readonly searchTerm: WritableSignal<string> = signal<string>('');
  protected readonly selectedInMemory: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set<string>());
  readonly #initialSelected: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(new Set<string>());

  protected readonly filteredChannels: Signal<readonly PartnerChannel[]> = computed<readonly PartnerChannel[]>(() => {
    const normalized = this.searchTerm().trim().toLowerCase();
    if (!normalized) {
      return this.availableChannels();
    }
    return this.availableChannels().filter(channel => channel.name.toLowerCase().includes(normalized));
  });

  readonly #added: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const initial = this.#initialSelected();
    return Array.from(this.selectedInMemory())
      .filter(id => !initial.has(id))
      .sort();
  });

  readonly #removed: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const selected = this.selectedInMemory();
    return Array.from(this.#initialSelected())
      .filter(id => !selected.has(id))
      .sort();
  });

  protected readonly hasChanges: Signal<boolean> = computed<boolean>(() => this.#added().length > 0 || this.#removed().length > 0);

  constructor() {
    effect(() => {
      if (this.open()) {
        const initial = new Set<string>(this.activeChannelIds());
        this.#initialSelected.set(initial);
        this.selectedInMemory.set(new Set<string>(initial));
        this.searchTerm.set('');
      }
    });
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  protected toggleChannel(channelId: string): void {
    const next = new Set<string>(this.selectedInMemory());
    if (next.has(channelId)) {
      next.delete(channelId);
    } else {
      next.add(channelId);
    }
    this.selectedInMemory.set(next);
  }

  protected onSave(): void {
    this.saveChannels.emit({ added: [...this.#added()], removed: [...this.#removed()] });
  }

  protected onCancel(): void {
    this.closeSidebar.emit();
  }
}
