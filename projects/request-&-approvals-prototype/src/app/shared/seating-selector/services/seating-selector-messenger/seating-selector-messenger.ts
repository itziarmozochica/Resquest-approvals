import { NgZone } from '@angular/core';

import { Observable, OperatorFunction, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { SeatingSelectorMessage } from './seating-selector-message';

export class SeatingSelectorMessenger {
  private channel: MessageChannel;
  private port: MessagePort;
  private messageSubject = new Subject<SeatingSelectorMessage<any>>();

  constructor(private ngZone: NgZone) {
    this.channel = new MessageChannel();
    this.port = this.channel.port1;
    this.port.onmessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data) as SeatingSelectorMessage<any>;
      this.messageSubject.next(message);
    };
  }

  init(elem: { postMessage: (message: any, targetOrigin: string, transfer?: Transferable[]) => void }): void {
    elem.postMessage('seating-selector-handshake', '*', [this.channel.port2]);
  }

  end(): void {
    this.port.close();
    this.messageSubject.complete();
  }

  send(message: SeatingSelectorMessage<any>): void {
    this.port.postMessage(message);
  }

  listen<T extends SeatingSelectorMessage<any>>(type: string): Observable<T> {
    return this.messageSubject.asObservable().pipe(
      filter(message => message.type === type),
      map(message => message as T),
      this.runInZone(this.ngZone),
    );
  }

  private runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
    return source =>
      new Observable(observer => {
        const onNext = (value: T) => zone.run(() => observer.next(value));
        const onError = (e: any) => zone.run(() => observer.error(e));
        const onComplete = () => zone.run(() => observer.complete());
        return source.subscribe(onNext, onError, onComplete);
      });
  }
}
