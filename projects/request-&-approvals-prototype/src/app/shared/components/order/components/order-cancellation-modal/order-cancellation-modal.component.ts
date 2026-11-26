import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface OrderCancellationComments {
  comments: string;
}

@Component({
  selector: 'app-order-cancellation-modal-modal',
  standalone: false,
  templateUrl: './order-cancellation-modal.component.html',
  styleUrls: ['./order-cancellation-modal.component.scss'],
})
export class OrderCancellationModalComponent {
  @Input() title = '';
  @Input() orderId = '';
  @Input() description = '';
  @Input() placeholder = '';
  @Input() cancelButtonLabel = '';

  @Output() response = new EventEmitter<OrderCancellationComments>();
  comments = '';

  confirmCancellation(): void {
    this.comments = this.comments?.trim() || this.placeholder;
    this.response.emit({ comments: this.comments });
  }
}
