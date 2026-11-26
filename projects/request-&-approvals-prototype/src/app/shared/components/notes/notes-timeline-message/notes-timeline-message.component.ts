import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-notes-timeline-message',
  standalone: true,
  styleUrl: './notes-timeline-message.component.scss',
  templateUrl: './notes-timeline-message.component.html',
})
export class NotesTimelineMessageComponent {
  readonly message = input.required<string>();

  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  readonly #expanded = signal(false);
  readonly #overflows = signal(false);

  readonly isExpanded = computed(() => this.#expanded());
  readonly showToggle = computed(() => this.#expanded() || this.#overflows());

  constructor() {
    effect(() => {
      this.message();
      untracked(() => {
        afterNextRender(
          () => {
            this.#syncOverflow();
          },
          { injector: this.#injector },
        );
      });
    });

    effect(() => {
      this.#expanded();
      untracked(() => {
        afterNextRender(
          () => {
            this.#syncOverflow();
          },
          { injector: this.#injector },
        );
      });
    });

    afterNextRender(() => {
      const body = this.body();
      const resizeObserver = new ResizeObserver(() => {
        this.#syncOverflow();
      });
      resizeObserver.observe(body.nativeElement);
      this.#destroyRef.onDestroy(() => {
        resizeObserver.disconnect();
      });
      this.#syncOverflow();
    });
  }

  toggle(): void {
    this.#expanded.update(value => !value);
  }

  #syncOverflow(): void {
    const element = this.body()?.nativeElement;
    if (!element) {
      return;
    }
    if (this.#expanded()) {
      return;
    }
    this.#overflows.set(element.scrollHeight > element.clientHeight);
  }
}
