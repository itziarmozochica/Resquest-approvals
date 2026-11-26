import { NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../icons/icons.module';
import { SelectOption } from '../../layout/filters/select/select.interface';
import { PipesModule } from '../../pipes/pipes.module';
import languageCodes from './language-codes';

@Component({
  selector: 'app-language-code-selector',
  templateUrl: './language-code-selector.component.html',
  standalone: true,
  imports: [TranslateModule, NgIf, PipesModule, IconsModule, NgFor, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageCodeSelectorComponent implements OnChanges, OnInit {
  @Input() availableLanguageCodes?: string[];
  @Input() hasErrors = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() selectedOption = '';

  @Output() selected = new EventEmitter<Event>();

  protected languageCodeOptions: SelectOption[] = [];

  constructor(private changeDetectorRef: ChangeDetectorRef) {
    this.changeDetectorRef.markForCheck();
  }

  getLanguageCodeOptions(): SelectOption[] {
    if (this.availableLanguageCodes === undefined) {
      return Object.entries(languageCodes).map(([id, title]) => ({
        id,
        title,
      }));
    }

    return this.availableLanguageCodes.map(code => ({
      id: code,
      title: languageCodes[code] ?? code,
    }));
  }

  ngOnChanges({ selectedOption, hasErrors, required, readonly }: SimpleChanges): void {
    if (selectedOption) {
      this.selectedOption = selectedOption.currentValue;
    }
    if (hasErrors) {
      this.hasErrors = hasErrors.currentValue;
    }
    if (required) {
      this.required = required.currentValue;
    }
    if (readonly) {
      this.readonly = readonly.currentValue;
    }
    this.changeDetectorRef.markForCheck();
  }

  ngOnInit(): void {
    this.languageCodeOptions = this.getLanguageCodeOptions();
  }

  selectLanguage(event: Event): void {
    this.selected.emit(event);
  }
}
