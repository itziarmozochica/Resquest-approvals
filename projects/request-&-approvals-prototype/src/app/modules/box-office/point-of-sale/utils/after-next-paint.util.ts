import { Observable } from 'rxjs';

/**
 * Emits once the frame the current task produces has been painted: the animation frame runs right
 * before that paint, and the timeout it queues runs right after it. Work scheduled here leaves the
 * interaction that triggered it out of the INP measurement.
 */
export function afterNextPaint(): Observable<void> {
  return new Observable<void>(subscriber => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const frameId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => {
        subscriber.next();
        subscriber.complete();
      });
    });

    return () => {
      cancelAnimationFrame(frameId);

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  });
}
