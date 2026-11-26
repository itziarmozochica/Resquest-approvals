import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';

import { DeviceDetectorService } from 'ngx-device-detector';

import { SelectOption } from './select.interface';

@Component({
  selector: 'app-filter-select',
  standalone: false,
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class FilterSelectComponent implements OnInit, OnChanges {
  @Input() options: SelectOption[] = [];
  @Input() allowEmpty = false;
  @Input() allowAll = false;
  @Input() disabled = false;
  @Input() emptyLabel = '';
  @Input() preloadedOption: SelectOption | undefined;
  @Output() selected = new EventEmitter<SelectOption>();

  selectedOption: SelectOption | null = null;
  isMobile = false;

  constructor(private deviceDetectorService: DeviceDetectorService) {
    this.isMobile = this.deviceDetectorService.isMobile();
  }

  ngOnInit(): void {
    if ((false === this.allowEmpty || this.preloadedOption) && this.options) {
      this.selectedOption = this.preloadedOption || this.options[0] || null;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.options) {
      this.selectedOption = null;
    }

    if (changes.preloadedOption && changes.preloadedOption.currentValue) {
      this.selectOption(changes.preloadedOption.currentValue);
      return;
    }

    if (changes.allowEmpty || changes.options) {
      if (false === this.allowEmpty && Array.isArray(this.options) && this.options.length && this.selectedOption === null) {
        this.selectedOption = this.options[0];
      }
    }
  }

  selectMobileOption(event: any): void {
    const option: SelectOption | undefined = this.options.find((option: SelectOption) => option.id.toString() === event.target['value']);
    if (option !== undefined) {
      this.selectOption(option);
    }
  }

  selectOption(option: SelectOption): void {
    this.selectedOption = option;
    this.selected.emit(option);
  }
}
