import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-login-form-container',
  standalone: false,
  templateUrl: './login-form-container.component.html',
  styleUrls: ['./login-form-container.component.scss'],
})
export class LoginFormContainerComponent {
  get hasValidBackLink(): boolean {
    return Boolean(this.backLink && this.backLink.trim() !== '');
  }
  @Input() backLink = '';
  @Input() componentAsModal = false;
  @Input() showTitle = true;
  @Input() hideBackButtons = false;
  @Input() isExternalLink = false;
  @Input() logo: string | null = null;
  @Input() title = '';
}
