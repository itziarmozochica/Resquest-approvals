import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, TranslateModule],
  selector: 'app-split-pack-selector-modal',
  standalone: true,
  styleUrl: './split-pack-selector-modal.component.scss',
  templateUrl: './split-pack-selector-modal.component.html',
})
export class SplitPackSelectorModalComponent {
  readonly #data = inject(DIALOG_DATA, { optional: true }) as { maxCount: number; packName: string } | null;
  readonly #dialogRef = inject(DialogRef<number>);

  maxCount = this.#data?.maxCount ?? 1;
  packName = this.#data?.packName ?? '';

  count = signal<number>(1);

  close(confirmed: boolean): void {
    if (confirmed) {
      this.#dialogRef.close(this.count());
    } else {
      this.#dialogRef.close();
    }
  }

  decrement(): void {
    const current = this.count();
    if (current > 1) {
      this.count.set(current - 1);
    }
  }

  increment(): void {
    const current = this.count();
    if (current < this.maxCount) {
      this.count.set(current + 1);
    }
  }
}
