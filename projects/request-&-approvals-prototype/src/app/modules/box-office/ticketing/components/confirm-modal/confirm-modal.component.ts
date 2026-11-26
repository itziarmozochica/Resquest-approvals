import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ConfirmModalConfig {
  title: string;
  message: string;
  leftButtonText: string;
  rightButtonText: string;
}

@Component({
  selector: 'app-confirm-modal',
  standalone: false,
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss'],
})
export class ConfirmModalComponent {
  @Input() config: ConfirmModalConfig;
  @Output() response = new EventEmitter<boolean>();
}
