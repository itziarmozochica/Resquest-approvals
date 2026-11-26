import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-filter-select-option',
  standalone: false,
  templateUrl: './select-option.component.html',
  styleUrls: ['./select-option.component.scss'],
})
export class FilterSelectOptionComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() selected = false;
}
