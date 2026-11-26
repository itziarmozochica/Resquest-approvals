import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { map } from 'rxjs';

import { parsePlaceId } from '../../../shared/helpers/parse-place-id';
import { PaymentConfigurationEditorComponent } from '../payment-configuration-editor/payment-configuration-editor.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaymentConfigurationEditorComponent],
  selector: 'app-payment-configuration-editor-page',
  standalone: true,
  templateUrl: './payment-configuration-editor-page.component.html',
})
export class PaymentConfigurationEditorPageComponent {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  protected readonly placeId = toSignal(this.#route.queryParamMap.pipe(map(params => parsePlaceId(params.get('venueId')))), {
    initialValue: parsePlaceId(this.#route.snapshot.queryParamMap.get('venueId')),
  });

  protected readonly configurationId = toSignal(this.#route.paramMap.pipe(map(params => params.get('configurationId'))), {
    initialValue: this.#route.snapshot.paramMap.get('configurationId'),
  });

  readonly #initialPlaceId = this.placeId();

  constructor() {
    effect(() => {
      const placeId = this.placeId();
      if (placeId === undefined || placeId !== this.#initialPlaceId) {
        this.backToList();
      }
    });
  }

  protected backToList(): void {
    this.#router.navigate(['/box-office/settings'], {
      queryParams: { tab: 'payment-configurations' },
      queryParamsHandling: 'merge',
    });
  }
}
