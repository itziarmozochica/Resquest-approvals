import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CenteredDialogComponent } from '@fz-original/app/shared/components/centered-dialog/centered-dialog.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { CustomTileColorKeys, CustomTileColors } from '../../../models/custom-tile.model';
import { DialogEditTileAppearanceFormValues } from '../../../models/edit-tile-appearance.model';
import { CustomTabTile } from '../../../services/onsite-setup-custom-tabs/onsite-setup-custom-tabs.model';

function getColorKeyFromValue(colorValue: string | null, defaultKey: CustomTileColorKeys): CustomTileColorKeys {
  if (!colorValue) return defaultKey;

  const normalizedColor = colorValue.toLowerCase();
  const entry = Object.entries(CustomTileColors).find(([, value]) => value.toLowerCase() === normalizedColor);
  return (entry?.[0] as CustomTileColorKeys) ?? defaultKey;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CenteredDialogComponent, FontAwesomeModule, IgntInputFieldComponent, ReactiveFormsModule, TranslateModule],
  selector: 'app-dialog-edit-tile-appearance',
  standalone: true,
  styleUrls: ['./edit-tile-appearance.component.scss'],
  templateUrl: './edit-tile-appearance.component.html',
})
export class DialogEditTileAppearanceComponent {
  #destroyRef = inject(DestroyRef);
  #formBuilder = inject(FormBuilder);

  #isFormInvalid = signal<boolean>(false);

  readonly closed = output<void>();
  readonly currentCustomName = signal<string>('');
  readonly defaultColorKey = input<CustomTileColorKeys>('positive');
  readonly dialogTitle = computed(() => this.initialTile()?.customName || this.initialTile()?.name || '');
  readonly editForm = this.#formBuilder.group({
    customName: ['', [Validators.maxLength(30)]],
  });
  readonly initialTile = input<CustomTabTile | null>(null);
  readonly isActionButtonDisabled = computed(() => this.#isFormInvalid() || this.#hasNoChanges());
  readonly isVisible = input.required<boolean>();
  readonly selectedColorKey = signal<CustomTileColorKeys>('positive');
  readonly submitted = output<DialogEditTileAppearanceFormValues>();
  readonly tileColorKeys = Object.keys(CustomTileColors) as CustomTileColorKeys[];
  readonly tileColors = CustomTileColors;

  constructor() {
    this.editForm.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => {
      this.currentCustomName.set(value.customName ?? '');
      this.#isFormInvalid.set(this.editForm.invalid);
    });

    effect(() => {
      const isVisible = this.isVisible();
      const tile = this.initialTile();
      const defaultColor = this.defaultColorKey();

      untracked(() => {
        if (!isVisible) return;

        if (tile) {
          this.editForm.patchValue({ customName: tile.customName ?? '' });
          this.selectedColorKey.set(getColorKeyFromValue(tile.customColor, defaultColor));
        } else {
          this.editForm.reset();
          this.selectedColorKey.set(defaultColor);
        }
      });
    });
  }

  dismiss(): void {
    this.editForm.reset();
    this.selectedColorKey.set(this.defaultColorKey());
    this.closed.emit();
  }

  onColorChange(colorKey: CustomTileColorKeys): void {
    this.selectedColorKey.set(colorKey);
  }

  submit(): void {
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid || this.#hasNoChanges()) return;

    const customName = this.editForm.value.customName?.trim() || null;
    const customColor = CustomTileColors[this.selectedColorKey()] || null;

    this.submitted.emit({ customColor, customName });
    this.dismiss();
  }

  #hasNoChanges(): boolean {
    const initial = this.initialTile();
    if (!initial) return true;

    const currentName = this.currentCustomName().trim() || null;
    const currentColor = CustomTileColors[this.selectedColorKey()];
    const initialColor = CustomTileColors[getColorKeyFromValue(initial.customColor, this.defaultColorKey())];

    return currentName === (initial.customName ?? null) && currentColor === initialColor;
  }
}
