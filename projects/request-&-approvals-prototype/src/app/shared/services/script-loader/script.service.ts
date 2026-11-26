import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, Renderer2, RendererFactory2 } from '@angular/core';

import { Observable } from 'rxjs';
import { share } from 'rxjs/operators';

import { Script } from './script.model';

@Injectable({
  providedIn: 'root',
})
export class ScriptService {
  private renderer: Renderer2;
  private scriptRequested: {
    [name: string]: Observable<Event>;
  } = {};

  constructor(
    rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  private scriptObservable(scriptData: Script): Observable<Event> {
    return new Observable<Event>(observer => {
      if (isPlatformServer(this.platformId)) {
        return;
      }
      const script = this.renderer.createElement('script');
      script.type = scriptData.type;
      script.src = scriptData.src;
      script.async = scriptData.async;
      script.id = scriptData.id;
      this.renderer.appendChild(this.document.body, script);
      script.onload = (event: Event) => {
        observer.next(event);
        observer.complete();
      };
      script.onerror = (err: unknown) => {
        observer.error(err);
      };
    });
  }

  loadScript(scriptData: Script): Observable<Event> {
    return (this.scriptRequested[scriptData.id] = this.scriptRequested[scriptData.id] || this.scriptObservable(scriptData).pipe(share()));
  }

  checkIfScriptIsLoaded(scriptId: string) {
    return this.document.getElementById(scriptId);
  }

  removeFromDocument(scriptId: string) {
    const scriptElement: HTMLElement | null = this.document.getElementById(scriptId);
    if (scriptElement !== null) {
      scriptElement.remove();
    }
  }

  removeScriptByAttribute(attributeName: string, value: string): void {
    const scriptElements: HTMLScriptElement[] = Array.from(this.document.getElementsByTagName('script'));
    scriptElements.forEach((script: HTMLScriptElement) => {
      if (script.getAttribute(attributeName)?.includes(value)) {
        script.remove();
      }
    });
  }
}
