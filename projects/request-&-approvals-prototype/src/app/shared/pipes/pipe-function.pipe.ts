import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pipeFunction',
  standalone: false,
})
export class PipeFunction implements PipeTransform {
  transform(value?: any, handler?: (value?: any) => any, context?: any): any {
    if (handler) {
      if (context) {
        return handler.call(context, value);
      }

      return handler(value);
    }
    return value;
  }
}
