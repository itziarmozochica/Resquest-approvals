import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { PlanRequest } from '../../models/plan-request/plan-request.model';

@Component({
  selector: 'app-plan-request-review',
  standalone: false,
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.scss'],
})
export class ReviewComponent implements OnInit {
  @Input() userEmail: string;
  @Input() planRequest: PlanRequest;
  @Output() updateIsFormValid: EventEmitter<boolean> = new EventEmitter<boolean>();

  ngOnInit(): void {
    this.updateIsFormValid.emit(this.planRequest.checkMandatoryFields());
  }
}
