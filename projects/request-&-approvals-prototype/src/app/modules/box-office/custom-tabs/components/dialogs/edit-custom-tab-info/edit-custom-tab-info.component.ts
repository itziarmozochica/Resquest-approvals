import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { OssCustomTabType, OssCustomTabTypes } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { CenteredDialogComponent } from '@fz-original/app/shared/components/centered-dialog/centered-dialog.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { startWith } from 'rxjs';

import { CustomTabIcons, CustomTabIconsTypes } from '../../../models/custom-tabs.model';
import { DialogEditCustomFormValues, DialogEditCustomTabMode, DialogEditCustomTabModes } from '../../../models/edit-custom-tab-info.model';
import { CustomTab } from '../../../services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.model';

function extractIconTypeFromString(iconString: string | undefined): CustomTabIconsTypes | null {
  if (!iconString) return null;
  const hyphenIndex = iconString.indexOf('-');
  if (hyphenIndex === -1) {
    return iconString as CustomTabIconsTypes;
  }
  return iconString.substring(hyphenIndex + 1) as CustomTabIconsTypes;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CenteredDialogComponent, FontAwesomeModule, IgntInputFieldComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-dialog-edit-custom-tab-info',
  standalone: true,
  styleUrls: ['./edit-custom-tab-info.component.scss'],
  templateUrl: './edit-custom-tab-info.component.html',
})
export class DialogEditCustomTabInfoComponent {
  #formBuilder = inject(FormBuilder);
  readonly editForm = this.#formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(11)]],
  });
  readonly #formStatus = toSignal(this.editForm.statusChanges.pipe(startWith(this.editForm.status)));
  readonly #formValue = toSignal(this.editForm.valueChanges.pipe(startWith(this.editForm.value)));
  readonly closed = output<void>();
  readonly customTabIcons = Object.values(CustomTabIcons);
  readonly initialTab = input<CustomTab | null>(null);
  readonly selectedIconType = signal<CustomTabIconsTypes | null>(null);
  readonly selectedTabType = signal<OssCustomTabTypes | null>(null);
  readonly isActionButtonDisabled = computed(
    () => this.#formStatus() !== 'VALID' || !this.selectedIconType() || !this.selectedTabType() || this.#hasNoChanges(),
  );
  readonly mode = input.required<DialogEditCustomTabModes>();
  readonly isCreateMode = computed(() => this.mode() === DialogEditCustomTabMode.CREATE);
  readonly isEditTabTypeDisabled = computed(() => (this.initialTab()?.tiles?.length ?? 0) > 0);
  readonly isVisible = input.required<boolean>();
  readonly submitted = output<DialogEditCustomFormValues>();
  readonly tabTypes = OssCustomTabType;

  constructor() {
    effect(() => {
      const isVisible = this.isVisible();
      const customTab = this.initialTab();
      untracked(() => {
        if (!isVisible || !customTab) return;

        this.editForm.patchValue({ name: customTab.name });
        const iconType = extractIconTypeFromString(customTab.icon);
        this.selectedIconType.set(iconType);
        this.selectedTabType.set(customTab.type);
      });
    });
  }

  dismiss(): void {
    this.editForm.reset();
    this.selectedIconType.set(null);
    this.selectedTabType.set(null);
    this.closed.emit();
  }

  onIconChange(icon: CustomTabIconsTypes): void {
    this.selectedIconType.set(icon);
  }

  onTabTypeChange(type: OssCustomTabTypes): void {
    if (this.isEditTabTypeDisabled()) {
      return;
    }

    this.selectedTabType.set(type);
  }

  submit(): void {
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid || !this.selectedIconType() || !this.selectedTabType() || this.#hasNoChanges()) return;

    this.submitted.emit({
      name: this.editForm.value.name!,
      icon: this.selectedIconType()!,
      tabType: this.selectedTabType()!,
    });
    this.dismiss();
  }

  #hasNoChanges(): boolean {
    const initial = this.initialTab();
    if (!initial) return false;

    return (
      this.#formValue()?.name === initial.name &&
      this.selectedIconType() === extractIconTypeFromString(initial.icon) &&
      this.selectedTabType() === initial.type
    );
  }
}
