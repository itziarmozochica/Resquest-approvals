import { AfterContentInit, ContentChild, Directive, DoCheck, ElementRef, OnDestroy, Renderer2 } from '@angular/core';

import { Subscription } from 'rxjs';

import { HelpTopicBannerComponent } from '../../components/help-topic-banner/help-topic-banner.component';

@Directive({
  selector: '[appHideWrapperOnHelpTopicClose]',
  standalone: true,
})
export class HideWrapperOnHelpTopicCloseDirective implements AfterContentInit, OnDestroy, DoCheck {
  static readonly DISMISSED_STORAGE_KEY = 'help-topic-banner-dismissed';

  @ContentChild(HelpTopicBannerComponent)
  private banner?: HelpTopicBannerComponent;

  private subscription?: Subscription;
  private isHidden = false;
  private lastKey = '';

  constructor(
    private host: ElementRef<HTMLElement>,
    private renderer: Renderer2,
  ) {}

  ngAfterContentInit(): void {
    if (this.banner) {
      this.subscription = this.banner.helpTopicClosed.subscribe(() => {
        this.markDismissed(this.computeKeyFromBanner());
        this.hide();
      });

      this.lastKey = this.computeKeyFromBanner();
      if (this.isDismissed(this.lastKey)) {
        this.hide();
      }
    }
  }

  ngDoCheck(): void {
    if (this.banner) {
      const currentKey = this.computeKeyFromBanner();

      if (currentKey !== this.lastKey) {
        this.lastKey = currentKey;
        const shouldHide = this.isDismissed(currentKey);

        if (shouldHide && !this.isHidden) {
          this.hide();
        } else if (!shouldHide && this.isHidden) {
          this.show();
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private computeKeyFromBanner(): string {
    return `${this.banner?.message}::${this.banner?.ctaLabel}::${this.banner?.ctaLink}`;
  }

  private hide(): void {
    this.renderer.setStyle(this.host.nativeElement, 'display', 'none');
    this.isHidden = true;
  }

  private isDismissed(key: string): boolean {
    return this.readDismissedKeys().has(key);
  }

  private markDismissed(key: string): void {
    const keys = this.readDismissedKeys();
    keys.add(key);
    localStorage.setItem(HideWrapperOnHelpTopicCloseDirective.DISMISSED_STORAGE_KEY, JSON.stringify([...keys]));
  }

  private readDismissedKeys(): Set<string> {
    try {
      const raw = localStorage.getItem(HideWrapperOnHelpTopicCloseDirective.DISMISSED_STORAGE_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private show(): void {
    this.renderer.setStyle(this.host.nativeElement, 'display', 'block');
    this.isHidden = false;
  }
}
