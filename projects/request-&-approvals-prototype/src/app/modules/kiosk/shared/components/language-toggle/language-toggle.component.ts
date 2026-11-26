import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { isString } from '@fz-original/app/app/utils/ts/ts.util';
import { DatadogLogLevel } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { LanguageResource } from '@fz-original/app/modules/kiosk/models/language-resource.model';
import { KioskLanguageService } from '@fz-original/app/modules/kiosk/services/kiosk-language.service';
import { KioskService } from '@fz-original/app/modules/kiosk/services/kiosk.service';
import {
  KioskLanguage,
  KioskLanguageModalData,
} from '@fz-original/app/modules/kiosk/shared/components/modals/kiosk-language/kiosk-language-modal.model';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntil, timer } from 'rxjs';

import { KioskLanguageModalComponent } from '../modals/kiosk-language/kiosk-language-modal.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, NgIf, TranslateModule],
  selector: 'app-language-toggle',
  styleUrl: './language-toggle.component.scss',
  templateUrl: './language-toggle.component.html',
})
export class LanguageToggleComponent {
  static readonly autoCloseDelayMs = 60_000;
  static readonly baseTranslateButton = 'kiosk.language.option.';
  readonly #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(Dialog);
  readonly #kioskLanguageService = inject(KioskLanguageService);
  readonly #kioskService = inject(KioskService);
  #languageModalOptions: KioskLanguage[] = [];
  #languages: (string | LanguageResource)[] = [];
  selectedLanguageOption: KioskLanguage | null = null;
  #touchHandled = false;

  constructor() {
    this.#kioskLanguageService
      .observeLanguages()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(languages => {
        if (languages.length > 0) {
          this.#languages = languages;
          this.#languageModalOptions = [];
          this.#loadLanguageModalOptions();
          this.#changeDetectorRef.markForCheck();
        }
      });
  }

  languageToggleClick(event: MouseEvent | TouchEvent): void {
    if (!event.isTrusted) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();

    if (event.type === 'touchend') {
      this.#touchHandled = true;
      this.#logModalOpened(event);
      this.openLanguageDialog();
    } else if (event.type === 'click') {
      if (this.#touchHandled) {
        this.#touchHandled = false;
        return;
      }
      this.#logModalOpened(event);
      this.openLanguageDialog();
    }
  }

  openLanguageDialog(): void {
    if (this.selectedLanguageOption === null) {
      return;
    }

    const dialog: DialogRef<KioskLanguage | undefined, KioskLanguageModalComponent> = this.#dialog.open(KioskLanguageModalComponent, {
      data: { languages: this.#languageModalOptions, selected: this.selectedLanguageOption } satisfies KioskLanguageModalData,
    });
    dialog.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((lang: KioskLanguage | undefined) => {
      if (lang !== undefined) {
        this.#onLanguageSelected(lang.id);
      }
    });
    timer(LanguageToggleComponent.autoCloseDelayMs)
      .pipe(takeUntil(dialog.closed), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => dialog.close());
  }

  #loadLanguageModalOptions(): void {
    this.#languages.forEach((lang: string | LanguageResource) => {
      const id: string = isString(lang) ? lang : (lang as LanguageResource).language;
      this.#languageModalOptions = [
        ...this.#languageModalOptions,
        {
          id: id,
          label: `${LanguageToggleComponent.baseTranslateButton}${id}`,
        },
      ];
    });
    const currentLang: string | LanguageResource | null = this.#kioskLanguageService.currentLanguage;
    if (currentLang !== null) {
      this.#onLanguageSelected(currentLang);
    }
  }

  #logModalOpened(event: MouseEvent | TouchEvent): void {
    const point: MouseEvent | Touch | undefined = 'changedTouches' in event ? event.changedTouches[0] : event;
    const activeElement: Element | null = document.activeElement;
    this.#kioskService.logTrace('Kiosk language modal opened', DatadogLogLevel.Info, {
      active_element: activeElement?.tagName ?? null,
      active_element_fzk: activeElement?.getAttribute('data-fzk') ?? null,
      client_x: point?.clientX ?? null,
      client_y: point?.clientY ?? null,
      detail: event.detail,
      document_has_focus: document.hasFocus(),
      event_type: event.type,
      pointer_type: 'pointerType' in event ? event.pointerType : null,
      screen_x: point?.screenX ?? null,
      screen_y: point?.screenY ?? null,
      target: event.target instanceof Element ? event.target.tagName : null,
      visibility_state: document.visibilityState,
    });
  }

  #onLanguageSelected(lang: string | LanguageResource): void {
    this.#kioskLanguageService.useLanguage(lang);

    const langCode: string = isString(lang) ? lang : (lang as LanguageResource).language;
    this.selectedLanguageOption = this.#languageModalOptions.find(button => button.id === langCode) ?? null;
    this.#changeDetectorRef.markForCheck();
  }
}
