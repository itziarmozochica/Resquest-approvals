import { Component, Input } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Cart } from '../../../../../shared/models/cart/cart.model';

@Component({
  selector: 'app-cart-modal',
  standalone: false,
  templateUrl: './cart-modal.component.html',
  styleUrls: ['./cart-modal.component.scss'],
})
export class CartModalComponent {
  @Input() cart: Cart;
  @Input() planVenue: string;

  constructor(private modal: NgbActiveModal) {}

  close(): void {
    this.modal.close();
  }
}
