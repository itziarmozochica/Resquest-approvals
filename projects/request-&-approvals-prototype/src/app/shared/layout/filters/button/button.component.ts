import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-filter-button',
  standalone: false,
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
})
export class FilterButtonComponent {
  @Input() disabled = false;
}
