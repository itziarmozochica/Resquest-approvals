import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';

import type { OnsiteSetupVenueOption } from '@fz/ticketing';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';

import { FztOnsiteSetupTileComponent } from '../onsite-setup-tile/onsite-setup-tile.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FztOnsiteSetupTileComponent, IgntIconButtonComponent, IgntIconComponent, IgntInputFieldComponent, ReactiveFormsModule],
  selector: 'fzt-onsite-setup-venue-picker',
  styleUrl: './onsite-setup-venue-picker.component.scss',
  templateUrl: './onsite-setup-venue-picker.component.html',
})
export class FztOnsiteSetupVenuePickerComponent {
  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly searchInput = viewChild(IgntInputFieldComponent);
  readonly closeSearchLabel = input.required<string>();
  readonly label = input.required<string>();
  readonly searchControl = input.required<FormControl<string>>();
  readonly searchLabel = input.required<string>();
  readonly searchPlaceholder = input.required<string>();
  readonly venues = input.required<readonly OnsiteSetupVenueOption[]>();
  readonly isCompact = input(false);
  readonly isSearchFieldVisible = input(false);
  readonly selectedVenueId = input<number | null>(null);
  readonly showCloseSearchButton = input(false);
  readonly searchClosed = output();
  readonly searchEnterPressed = output();
  readonly venueSelected = output<OnsiteSetupVenueOption>();

  // Deferred to the next frame: the shell calls this right after it reveals the search row, before Angular has rendered it.
  focusSearch(): void {
    requestAnimationFrame(() => {
      const inputElement = this.searchInput()?.inputElement as ElementRef<HTMLInputElement> | undefined;

      inputElement?.nativeElement.focus();
    });
  }

  scrollToVenue(venueId: number): void {
    const venueElement = this.#elementRef.nativeElement.querySelector<HTMLElement>(`[data-venue-id="${venueId}"]`);

    venueElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}
