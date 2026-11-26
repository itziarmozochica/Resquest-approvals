import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

import { StepperCatalogEntry } from '../../domain/stepper-catalog';

@Component({
  selector: 'app-stepper-catalog-panel',
  templateUrl: './stepper-catalog-panel.component.html',
  styleUrls: ['./stepper-catalog-panel.component.scss'],
  imports: [CommonModule, TranslateModule, IgntButtonComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepperCatalogPanelComponent {
  @Input() templates: StepperCatalogEntry[] = [];
  @Input() selectedKey: string | null = null;
  @Input() loadingKey: string | null = null;

  @Output() selected = new EventEmitter<string>();
  @Output() created = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<string>();

  readonly confirmingKey = signal<string | null>(null);

  onSelect(key: string): void {
    this.selected.emit(key);
  }

  onCreate(): void {
    this.created.emit();
  }

  requestDelete(key: string): void {
    this.confirmingKey.set(key);
  }

  cancelDelete(): void {
    this.confirmingKey.set(null);
  }

  confirmDelete(key: string): void {
    this.confirmingKey.set(null);
    this.deleted.emit(key);
  }
}
