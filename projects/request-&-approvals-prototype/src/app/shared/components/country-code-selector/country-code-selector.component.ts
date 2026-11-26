import { Component, EventEmitter, Input, Output } from '@angular/core';

import countryCodes from './country-codes';

@Component({
  selector: 'app-country-code-selector',
  standalone: false,
  templateUrl: './country-code-selector.component.html',
})
export class CountryCodeSelectorComponent {
  readonly countryCodes = countryCodes;
  @Input() hasErrors = false;
  @Input() readonly = false;
  @Input() required = false;
  @Output() selected = new EventEmitter<Event>();
  @Input() selectedOption = '';
}
