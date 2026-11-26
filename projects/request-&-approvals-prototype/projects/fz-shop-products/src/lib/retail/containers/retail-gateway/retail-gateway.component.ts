import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type Data } from '@angular/router';

import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { map } from 'rxjs';

import { RetailPageTitleComponent } from '../../components/retail-page-title/retail-page-title.component';
import type { RetailGateway } from '../../models/retail-gateway-resolve.model';
import { RetailCreateComponent } from '../retail-create/retail-create.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, RetailCreateComponent, RetailPageTitleComponent, TranslateModule],
  selector: 'fz-retail-gateway',
  styleUrl: './retail-gateway.component.scss',
  templateUrl: './retail-gateway.component.html',
})
export class RetailGatewayComponent {
  readonly #route = inject(ActivatedRoute);

  readonly gateway = toSignal(this.#route.data.pipe(map((data: Data) => data.gateway as RetailGateway)), {
    initialValue: this.#route.snapshot.data.gateway as RetailGateway,
  });
}
