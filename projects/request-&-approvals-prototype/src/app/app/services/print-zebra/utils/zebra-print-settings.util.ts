import { CutterTypeEnum, PaperTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';

import { ZebraPrinterConfig } from '../../print-v2/models/print-command.model';

export type ZebraCut = 'full' | 'none';

export interface ZebraCuts {
  final: ZebraCut;
  middle: ZebraCut;
}

export function resolveZebraCuts(config: ZebraPrinterConfig): ZebraCuts {
  const final: ZebraCut = config.cutterType === CutterTypeEnum.basic_cutter ? 'full' : 'none';

  return { final, middle: config.shouldCutEveryTicket ? final : 'none' };
}

export function isZebraPrePrintedPaper(config: ZebraPrinterConfig): boolean {
  return config.paperType === PaperTypeEnum.pre_printed_paper;
}
