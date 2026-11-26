import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntSkeletonComponent],
  selector: 'app-immersive-module-preview',
  standalone: true,
  styleUrl: './immersive-module-preview.component.scss',
  templateUrl: './immersive-module-preview.component.html',
})
export class ImmersiveModulePreviewComponent {
  readonly alt = input.required<string>();
  readonly src = input.required<string>();

  // Roughly the height a capture settles at once the container caps it at 80% of the form width.
  // It only reserves the placeholder's box; the loaded image keeps its own aspect ratio.
  protected readonly previewHeight = 280;

  // Track WHICH source resolved rather than a plain boolean flag: the moment `src` changes, the
  // comparison turns false on its own and the placeholder is back, so the previous module's
  // capture can never linger on screen while the new one downloads. No effect, no reset call.
  readonly #failedSrc = signal<string | null>(null);
  readonly #loadedSrc = signal<string | null>(null);

  protected readonly failed = computed(() => this.#failedSrc() === this.src());
  protected readonly loaded = computed(() => this.#loadedSrc() === this.src());

  protected onError(): void {
    this.#failedSrc.set(this.src());
  }

  protected onLoad(): void {
    this.#loadedSrc.set(this.src());
  }
}
