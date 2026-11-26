import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SalesRoutingShellComponent } from './components/sales-routing-shell/sales-routing-shell.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SalesRoutingShellComponent],
  selector: 'fz-sales-routing',
  standalone: true,
  styleUrl: './sales-routing.component.scss',
  templateUrl: './sales-routing.component.html',
})
export class SalesRoutingComponent {}
