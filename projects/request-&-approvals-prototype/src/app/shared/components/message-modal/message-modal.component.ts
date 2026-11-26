import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { ShowErrorModalEvent } from '../../../core/tracking/core/events/show-error-modal';
import { TrackingService } from '../../../core/tracking/tracking.service';

@Component({
  selector: 'app-message-modal',
  standalone: false,
  styleUrls: ['./message-modal.component.scss'],
  templateUrl: './message-modal.component.html',
})
export class MessageModalComponent {
  @Input() set logError(codeError: string) {
    this.sendMixpanelEvent(codeError);
  }

  @Input() title = '';
  @Input() messages: string[] = [];
  @Input() acceptButtonLabel = 'OK';
  @Input() cancelButtonLabel = '';
  @Input() useTitleAsHeader = false;
  @Input() hasCloseButton = false;
  @Input() errorCode: string | number | null = null;
  @Input() errorCodeLabel = '';
  @Input() infoBannerText = '';
  @Input() showWarningIcon = false;
  @Input() infoBannerSentiment: AlertSentiment = AlertSentiment.info;
  @Input() confirmInformationTitle = '';
  @Input() confirmInformationData: string[] = [];
  @Input() confirmInformationQuestion = '';
  @Input() showDangerAcceptButton = false;
  @Input() showDangerCancelButton = false;
  @Input() useWrapper = true;
  @Input() swapModalActions = false;
  @Input() useCustomMessagesStyle = false;
  @Output() responseEmitter = new EventEmitter<boolean>();

  constructor(
    private modal: NgbActiveModal,
    private trackingService: TrackingService,
  ) {}

  close(response: boolean): void {
    this.responseEmitter.emit(response);
    this.modal.close(response);
  }

  sendMixpanelEvent(codeError: string): void {
    this.trackingService.track(
      new ShowErrorModalEvent({
        code_error: codeError,
        messages: this.messages.join(' '),
        title: this.title,
      }),
    );
  }
}
