import { AccessTicket } from '@fz-original/app/shared/models/order/access-ticket.model';
import { PrintImagesPrinterSettings } from '@fz-original/app/shared/services/webview-messenger/models/print-images-message.model';

import {
  PrintRepresentationType,
  RenderedPrintable,
  UnsupportedPrintRepresentationError,
} from '../../print-adapter/models/print-adapter.model';
import { PrintableObject } from '../../print-v2/models/print-command.model';
import { ZebraPrintChunk, ZebraPrintChunkEntry } from '../models/zebra-print-chunk.model';

interface ZebraPrintChunksState {
  chunks: ZebraPrintChunk[];
  current: ZebraPrintChunk;
}

const emptyChunk: ZebraPrintChunk = { base64Images: [], entries: [] };

export function buildZebraPrintChunks(documents: RenderedPrintable[], batchSize: number, adapterName: string): ZebraPrintChunk[] {
  const initialState: ZebraPrintChunksState = { chunks: [], current: emptyChunk };
  const finalState: ZebraPrintChunksState = documents.reduce(
    (state: ZebraPrintChunksState, { printable, representation }: RenderedPrintable): ZebraPrintChunksState => {
      if (representation.type !== PrintRepresentationType.images) {
        throw new UnsupportedPrintRepresentationError(adapterName, representation.type);
      }
      const images: string[] = representation.base64Images;
      const { printerSettings } = representation;
      const ticketCodes: string[] = Array.from(printable.order.accessTickets?.values() ?? []).map(
        (ticket: AccessTicket) => ticket.code ?? '',
      );

      if (printable.unifyTickets) {
        return images.length === 0 ? state : appendEntry(state, batchSize, { printable, ticketCodes }, images, printerSettings);
      }

      return appendSplit(state, batchSize, printable, images, ticketCodes, 0, printerSettings);
    },
    initialState,
  );

  return closeCurrent(finalState);
}

function closeCurrent({ chunks, current }: ZebraPrintChunksState): ZebraPrintChunk[] {
  return current.entries.length > 0 ? [...chunks, current] : chunks;
}

function startsNewChunk(state: ZebraPrintChunksState, batchSize: number, printerSettings?: PrintImagesPrinterSettings): boolean {
  const { current } = state;
  const hasOtherPrinterSettings: boolean =
    current.printerSettings?.backfeedBeforeCut !== printerSettings?.backfeedBeforeCut ||
    current.printerSettings?.markOffsetDots !== printerSettings?.markOffsetDots;

  return current.base64Images.length >= batchSize || (current.entries.length > 0 && hasOtherPrinterSettings);
}

function appendEntry(
  state: ZebraPrintChunksState,
  batchSize: number,
  entry: ZebraPrintChunkEntry,
  images: string[],
  printerSettings?: PrintImagesPrinterSettings,
): ZebraPrintChunksState {
  const { chunks, current }: ZebraPrintChunksState = startsNewChunk(state, batchSize, printerSettings)
    ? { chunks: closeCurrent(state), current: emptyChunk }
    : state;

  return {
    chunks,
    current: { base64Images: [...current.base64Images, ...images], entries: [...current.entries, entry], printerSettings },
  };
}

function appendSplit(
  state: ZebraPrintChunksState,
  batchSize: number,
  printable: PrintableObject,
  images: string[],
  ticketCodes: string[],
  start: number,
  printerSettings?: PrintImagesPrinterSettings,
): ZebraPrintChunksState {
  if (start >= images.length) {
    return state;
  }
  const room: number = startsNewChunk(state, batchSize, printerSettings) ? batchSize : batchSize - state.current.base64Images.length;
  const end: number = start + room;
  const next: ZebraPrintChunksState = appendEntry(
    state,
    batchSize,
    { printable, ticketCodes: ticketCodes.slice(start, end) },
    images.slice(start, end),
    printerSettings,
  );

  return appendSplit(next, batchSize, printable, images, ticketCodes, Math.min(end, images.length), printerSettings);
}
