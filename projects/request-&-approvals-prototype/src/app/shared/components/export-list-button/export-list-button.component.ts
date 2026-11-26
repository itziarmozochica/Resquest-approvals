import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

import { ExportOption } from './export-option.model';

export type ExportButtonType = 'primary' | 'secondary' | 'plain';

@Component({
  selector: 'app-export-list-button',
  standalone: false,
  templateUrl: './export-list-button.component.html',
  styleUrls: ['./export-list-button.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ExportListButtonComponent {
  @Output() clickOption: EventEmitter<ExportOption> = new EventEmitter<ExportOption>();
  @Input() exportOptionsDisabled = false;
  @Input() exportOptionsList: ExportOption[] = [];
  @Input() type: ExportButtonType = 'secondary';

  clickOnOption(optionType: ExportOption, event?: MouseEvent): void {
    event?.stopPropagation();
    if (this.exportOptionsDisabled) {
      return;
    }
    this.clickOption.emit(optionType);
  }
}
