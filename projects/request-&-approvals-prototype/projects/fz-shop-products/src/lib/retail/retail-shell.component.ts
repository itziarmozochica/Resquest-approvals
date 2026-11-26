import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { RetailPageTitleComponent } from './components/retail-page-title/retail-page-title.component';
import { RetailSetupStore } from './store/retail-setup.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, RetailPageTitleComponent, RouterOutlet, TranslateModule],
  selector: 'fz-retail-shell',
  styleUrl: './retail-shell.component.scss',
  templateUrl: './retail-shell.component.html',
})
export class RetailShellComponent {
  readonly #store = inject(RetailSetupStore);

  protected readonly isLoading = computed(() => this.#store.isLoading());
}
