import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { InformationRequestTemplateSummary } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-template.model';
import { TranslateModule } from '@ngx-translate/core';

const DYNAMIC_TEMPLATE_PREFIX = 'custom_';

@Component({
  selector: 'app-template-list-panel',
  templateUrl: './template-list-panel.component.html',
  styleUrls: ['./template-list-panel.component.scss'],
  imports: [CommonModule, TranslateModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateListPanelComponent {
  @Input() templates: InformationRequestTemplateSummary[] = [];
  @Input() expandedKey: string | null = null;
  @Input() loadingKey: string | null = null;
  @Input() touchedKeys: Set<string> = new Set();
  @Input() hiddenKeys: string[] = [];

  @Output() toggled = new EventEmitter<string>();
  @Output() hideToggled = new EventEmitter<string>();
  @Output() deleted = new EventEmitter<string>();

  readonly confirmingKey = signal<string | null>(null);

  onToggle(key: string): void {
    this.toggled.emit(key);
  }

  onHideToggle(key: string): void {
    this.hideToggled.emit(key);
  }

  isTouched(key: string): boolean {
    return this.touchedKeys.has(key);
  }

  isHidden(key: string): boolean {
    return this.hiddenKeys.includes(key);
  }

  isDynamic(key: string): boolean {
    return key.startsWith(DYNAMIC_TEMPLATE_PREFIX);
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
