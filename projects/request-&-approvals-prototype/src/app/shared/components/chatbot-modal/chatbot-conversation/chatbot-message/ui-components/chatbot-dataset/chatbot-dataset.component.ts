import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  InputSignal,
  OnInit,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { downloadChatbotDataset } from '@fz-original/app/modules/reports/fz-assistant-view/tracking/events/download-chatbot-dataset.event';
import { CHATBOT_CONTEXT } from '@fz-original/app/shared/components/chatbot-modal/chatbot-context.token';
import { GenericTableComponent, TableColumn } from '@fz-original/app/shared/components/generic-table/generic-table.component';
import { ChatbotDatasetPreview } from '@fz-original/app/shared/models/chatbot/chatbot.model';
import { ChatbotApiService } from '@fz-original/app/shared/services/chatbot/chatbot-api.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, exhaustMap, filter, finalize, map, Subject, tap } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericTableComponent, IgntIconComponent, TranslateModule],
  selector: 'app-chatbot-dataset',
  standalone: true,
  styleUrls: ['./chatbot-dataset.component.scss'],
  templateUrl: './chatbot-dataset.component.html',
})
export class ChatbotDatasetComponent implements OnInit {
  readonly #chatbotApiService = inject(ChatbotApiService);
  readonly #chatbotContext = inject(CHATBOT_CONTEXT);
  readonly #destroyRef = inject(DestroyRef);
  #download$ = new Subject<void>();
  readonly #partnerService = inject(PartnerService);
  readonly #toastService = inject(ToastService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #translate = inject(TranslateService);

  data: InputSignal<Record<string, unknown>> = input.required<Record<string, unknown>>();
  datasetName: Signal<string> = computed<string>(() => (this.data().name as string) ?? (this.data().id as string) ?? '');
  isExpanded: WritableSignal<boolean> = signal<boolean>(false);
  loading: WritableSignal<boolean> = signal<boolean>(false);
  preview: WritableSignal<ChatbotDatasetPreview | null> = signal<ChatbotDatasetPreview | null>(null);
  tableColumns: Signal<TableColumn<Record<string, unknown>>[]> = computed<TableColumn<Record<string, unknown>>[]>(() => {
    const previewData: ChatbotDatasetPreview | null = this.preview();
    if (!previewData) return [];
    return previewData.columns.map((col: string) => ({ header: col, key: col }));
  });
  tableData: Signal<Record<string, unknown>[]> = computed<Record<string, unknown>[]>(() => this.preview()?.data ?? []);

  constructor() {
    this.#initDownload();
  }

  ngOnInit(): void {
    this.#loadPreview();
  }

  onDownloadClick(): void {
    this.#download$.next();
  }

  toggleExpanded(): void {
    this.isExpanded.set(!this.isExpanded());
  }

  #initDownload(): void {
    this.#download$
      .pipe(
        map(() => ({
          assetId: this.data().id as string,
          partnerId: this.#partnerService.getPartner()?.id,
        })),
        filter(
          (downloadParams): downloadParams is { assetId: string; partnerId: number } =>
            !!downloadParams.assetId && downloadParams.partnerId !== undefined,
        ),
        tap(({ assetId }) => {
          this.#fzTracking.track(
            downloadChatbotDataset({
              chatbotContext: this.#chatbotContext,
              datasetId: assetId,
            }),
          );
        }),
        exhaustMap(({ assetId, partnerId }) => {
          this.loading.set(true);
          return this.#chatbotApiService.getAssetDownloadUrl(partnerId, assetId).pipe(
            catchError(() => {
              this.#toastService.add({
                message: this.#translate.instant('chatbot.error.download'),
                sentiment: AlertSentiment.danger,
              });
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((url: string) => {
        this.#openDownloadUrl(url);
      });
  }

  #loadPreview(): void {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    const assetId: string | undefined = this.data().id as string | undefined;

    if (!partnerId || !assetId) {
      return;
    }

    this.#chatbotApiService
      .getDatasetPreview(partnerId, assetId)
      .pipe(
        catchError(() => {
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result: ChatbotDatasetPreview) => {
        this.preview.set(result);
      });
  }

  #openDownloadUrl(url: string): void {
    const anchor: HTMLAnchorElement = document.createElement('a');
    anchor.href = url;
    anchor.rel = 'noopener noreferrer';
    anchor.target = '_blank';
    anchor.download = (this.data().id as string) + '.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}
