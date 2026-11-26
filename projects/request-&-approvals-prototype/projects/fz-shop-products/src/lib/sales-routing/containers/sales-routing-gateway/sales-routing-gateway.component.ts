import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, type Data } from '@angular/router';

import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule } from '@ngx-translate/core';
import { map } from 'rxjs';

import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { SalesRoutingShellComponent } from '../../components/sales-routing-shell/sales-routing-shell.component';
import type { SalesRoutingGateway } from '../../models/sales-routing-gateway-resolve.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, IgntAlertComponent, SalesRoutingShellComponent, TranslateModule],
  selector: 'fz-sales-routing-gateway',
  styleUrl: './sales-routing-gateway.component.scss',
  templateUrl: './sales-routing-gateway.component.html',
})
export class SalesRoutingGatewayComponent {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  readonly gateway = toSignal(this.#route.data.pipe(map((data: Data) => data.gateway as SalesRoutingGateway)), {
    initialValue: this.#route.snapshot.data.gateway as SalesRoutingGateway,
  });

  protected navigateToCatalogIntegrations(): void {
    this.#router.navigate(['/', 'products', 'catalog-integrations']).catch((error: unknown) => {
      console.error('Navigation failed', error);
    });
  }
}
