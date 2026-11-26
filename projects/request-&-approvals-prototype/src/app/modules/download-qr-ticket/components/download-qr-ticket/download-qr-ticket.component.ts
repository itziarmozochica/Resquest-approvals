import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { TicketBatchLink } from '../../models/download-qr-ticket.model';
import { DownloadQrTicketFacade } from '../../services/download-qr-ticket.facade';
import { downloadQrTicketTrackingProvider } from '../../tracking/download-qr-ticket.tracking-provider';
import { parseDownloadQrTicketLink } from '../../utils/download-qr-ticket-link.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  providers: [DownloadQrTicketFacade, ...downloadQrTicketTrackingProvider()],
  selector: 'app-download-qr-ticket',
  styleUrl: './download-qr-ticket.component.scss',
  templateUrl: './download-qr-ticket.component.html',
})
export class DownloadQrTicketComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #facade = inject(DownloadQrTicketFacade);
  readonly #route = inject(ActivatedRoute);

  protected readonly batches = this.#facade.batches;
  protected readonly hasBatches = computed(() => this.batches().length > 0);
  protected readonly hasOpenedTickets = this.#facade.hasOpenedTickets;
  protected readonly isLoading = this.#facade.isLoading;

  constructor() {
    this.#facade.init(parseDownloadQrTicketLink(this.#route.snapshot.queryParams));
  }

  protected openTickets(): void {
    this.#facade.openTickets().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  protected trackBatchOpen(batch: TicketBatchLink): void {
    this.#facade.trackBatchOpen(batch);
  }
}
