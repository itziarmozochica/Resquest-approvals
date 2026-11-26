export interface Code128Bar {
  width: number;
  x: number;
}

export interface Code128Symbol {
  bars: Code128Bar[];
  totalModules: number;
}

export enum Code128Fnc3 {
  leading = 'leading',
  none = 'none',
  trailing = 'trailing',
}
