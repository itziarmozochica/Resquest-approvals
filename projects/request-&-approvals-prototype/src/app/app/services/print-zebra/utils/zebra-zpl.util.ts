import { ZebraPrinterConfig } from '../../print-v2/models/print-command.model';
import {
  zebraBackfeedCommand,
  zebraCutCommands,
  zebraDarknessCommand,
  zebraDesktopResetCommands,
  zebraMediaTrackingCommands,
  zebraTearOffCommands,
} from '../zebra-printer-settings.const';
import { isZebraPrePrintedPaper, resolveZebraCuts, ZebraCut, ZebraCuts } from './zebra-print-settings.util';

export function toZebraBatchZpl(graphicFields: string[], config: ZebraPrinterConfig): string {
  const cuts: ZebraCuts = resolveZebraCuts(config);
  const lastIndex: number = graphicFields.length - 1;
  const labels: string = graphicFields
    .map((graphicField: string, index: number) => toLabelZpl(graphicField, index === lastIndex ? cuts.final : cuts.middle))
    .join('');

  return `${toSetupZpl(isZebraPrePrintedPaper(config))}${labels}`;
}

function toSetupZpl(isPrePrintedPaper: boolean): string {
  const paper: 'basic' | 'prePrinted' = isPrePrintedPaper ? 'prePrinted' : 'basic';

  return `${zebraTearOffCommands[paper]}${zebraBackfeedCommand}${zebraDarknessCommand}^XA${zebraMediaTrackingCommands[paper]}${zebraDesktopResetCommands}^XZ`;
}

function toLabelZpl(graphicField: string, cut: ZebraCut): string {
  return `^XA${zebraCutCommands[cut]}^FO0,0${graphicField}^FS^XZ`;
}
