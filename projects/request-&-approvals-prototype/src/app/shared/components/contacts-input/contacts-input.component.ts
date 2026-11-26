import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
  ValidatorFn,
  Validators,
} from '@angular/forms';

type OnChangeFn = (contacts: Array<string>) => void;
const SEPARATOR = /\s+/;

@Component({
  selector: 'app-contacts-input',
  standalone: false,
  templateUrl: './contacts-input.component.html',
  styleUrls: ['./contacts-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ContactsInputComponent,
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: ContactsInputComponent,
    },
  ],
})
export class ContactsInputComponent implements ControlValueAccessor, Validator {
  contacts: string[] = [];
  @ViewChild('contactsInput', { static: true }) contactsInput!: ElementRef;
  editingContactValue: string | null = null;
  @Input() inputName = 'contacts-new-input';
  isDisabled = false;
  newValueControl = new FormControl('', this.#validateEmailList());
  onChange!: OnChangeFn;
  onTouched!: () => void;
  onValidatorChange!: () => void;

  addNewValue(contact: string): void {
    this.newValueControl.updateValueAndValidity();
    if (!this.newValueControl.valid) {
      return;
    }

    if (!contact.includes(' ')) {
      const trimmedContact = contact.trim();
      if (trimmedContact) {
        this.contacts = [...this.contacts, trimmedContact];
        this.#onContactsUpdate();
        this.newValueControl.patchValue('');
        this.editingContactValue = null;
      }
      return;
    }

    const newContacts = contact
      .split(SEPARATOR)
      .map(email => email.trim())
      .filter(email => email);
    this.contacts = [...this.contacts, ...newContacts];
    this.#onContactsUpdate();
    this.newValueControl.patchValue('');
    this.editingContactValue = null;
  }

  cancelEdit(): void {
    if (this.editingContactValue) {
      this.contacts = [...this.contacts, this.editingContactValue];
      this.#onContactsUpdate();
    }

    this.editingContactValue = null;
    this.newValueControl.patchValue('');
  }

  editContact(index: number): void {
    if (index < 0 || index >= this.contacts.length) {
      return;
    }

    const contactToEdit = this.contacts[index];
    this.contacts = [...this.contacts.slice(0, index), ...this.contacts.slice(index + 1)];
    this.newValueControl.patchValue(contactToEdit);
    this.editingContactValue = contactToEdit;
    this.#onContactsUpdate();
    this.contactsInput.nativeElement.focus();
  }

  onAddValue(event: Event, shouldPreventDefault = false): void {
    if (shouldPreventDefault) {
      event.preventDefault();
    }

    this.addNewValue((event.target as HTMLInputElement).value);
  }

  @HostListener('keydown.backspace')
  onBackspace(): void {
    if (this.newValueControl.value === '' && this.contacts.length > 0) {
      const lastContact: string = this.contacts[this.contacts.length - 1];
      this.contacts = this.contacts.slice(0, -1);
      this.newValueControl.patchValue(lastContact);
      this.editingContactValue = lastContact;
      this.#onContactsUpdate();
      this.contactsInput.nativeElement.focus();
    }
  }

  onBlur(event: Event): void {
    if (this.newValueControl.value?.trim()) {
      this.onAddValue(event);
    }
  }

  @HostListener('click')
  onClick(): void {
    this.contactsInput.nativeElement.focus();
  }

  onSpaceOrEnterKeydown(event: Event): void {
    const isSpace = (event as KeyboardEvent).key === ' ';
    const isEnter = (event as KeyboardEvent).key === 'Enter';

    if (!isSpace && !isEnter) {
      return;
    }

    this.onAddValue(event, isSpace);
  }

  registerOnChange(fn: OnChangeFn): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange?(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  removeContactByIndex(index: number): void {
    if (index < 0 || index >= this.contacts.length) {
      return;
    }
    this.contacts = [...this.contacts.slice(0, index), ...this.contacts.slice(index + 1)];
    this.#onContactsUpdate();
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  trackByIndex(index: number): number {
    return index;
  }

  validate(): ValidationErrors | null {
    return null;
  }

  writeValue(contacts: Array<string>): void {
    this.contacts = contacts;
  }

  #onContactsUpdate(): void {
    if (this.onChange) {
      this.onChange(this.contacts);
    }
    if (this.onTouched) {
      this.onTouched();
    }
  }

  #validateEmailList(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value: string = control.value;
      if (!value) {
        return null;
      }
      const testControl = new FormControl('', Validators.email);

      if (!value.includes(' ')) {
        testControl.patchValue(value.trim());
        testControl.updateValueAndValidity();
        return testControl.valid ? null : { invalidEmail: true };
      }

      const isValid = value
        .split(SEPARATOR)
        .map(email => email.trim())
        .every(email => {
          testControl.patchValue(email);
          testControl.updateValueAndValidity();
          return testControl.valid;
        });

      return isValid ? null : { invalidEmail: true };
    };
  }
}
