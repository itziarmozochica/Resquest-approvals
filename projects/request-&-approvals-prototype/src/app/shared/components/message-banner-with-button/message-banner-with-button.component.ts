import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'app-message-banner-with-button',
  standalone: false,
  templateUrl: './message-banner-with-button.component.html',
  styleUrls: ['./message-banner-with-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageBannerWithButtonComponent implements OnChanges {
  #changeDetectorRef = inject(ChangeDetectorRef);
  @Output() bannerClosed = new EventEmitter<void>();
  @Input() buttonLink = '';
  @Input() buttonText = '';
  isVisible = true;
  @Output() linkClick = new EventEmitter<void>();
  @Input() message = '';

  goToLink(): void {
    this.linkClick.emit();
    if (this.buttonLink) {
      window.open(this.buttonLink, '_blank');
    }
  }

  handleClose() {
    this.isVisible = false;
    this.bannerClosed.emit();
    this.#changeDetectorRef.markForCheck();
  }

  ngOnChanges({ message, buttonText, buttonLink }: SimpleChanges): void {
    const messageChanged: boolean = message?.currentValue !== message?.previousValue;
    const buttonTextChanged: boolean = buttonText?.currentValue !== buttonText?.previousValue;
    const buttonLinkChanged: boolean = buttonLink?.currentValue !== buttonLink?.previousValue;
    if (!this.isVisible && (messageChanged || buttonTextChanged || buttonLinkChanged)) {
      this.isVisible = true;
      this.#changeDetectorRef.markForCheck();
    }
  }
}
