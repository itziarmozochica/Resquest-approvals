import { inject, Injectable, Injector, signal } from '@angular/core';

import { IGNT_DIALOG_TRANSLATIONS, IgntDialogService } from '@ignite/common';
import QRCode from 'qrcode';
import { firstValueFrom } from 'rxjs';

import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { CutterTypeEnum, OboPrinterTypeEnum, OnsiteSetup } from '../../../modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '../../../modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { JsonObject } from '../../models/json-object';
import { Money } from '../../models/money.model';
import { AccessTicket, getDiscountApplied } from '../../models/order/access-ticket.model';
import { Order } from '../../models/order/order.model';
import { PrinterOrder } from '../../models/order/printer-order.model';
import { TicketTimeGranularity } from '../../models/order/ticket-time-granularity.enum';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { PdfTableContent } from '../pdf-generator/models/content/pdf-table-content';
import { PrintImagesBackfeedSequence } from '../webview-messenger/models/print-images-message.model';
import { PrinterErrors } from '../zebra-printer/models/printer-errors.enum';
import { ZebraPrinterService } from '../zebra-printer/zebra-printer.service';
import { TicketGeneratorService } from './ticket-generator.service';

const PT_PER_MM = 72 / 25.4;

const STOCK_WIDTH_MM = 152;
const STOCK_HEIGHT_MM = 72;
// The white band runs 40 mm along the feed with the registration mark in its middle, so it reaches
// 20 mm either side of the mark. In mark mode the printer takes the mark as the label boundary and,
// once a label is printed, presents that boundary at the tear bar. Two settings decide where things
// land, and they are chosen together.
//
// ZPL_STACK, which end of each ticket leaves the printer first:
// - `bandFirst`: the band leads. The block frames well, but the printer stops as soon as the band is
//   out and leaves the rest of the ticket inside, because the boundary it presents is tied to the band.
// - `bandLast`: the stack turned end for end, so the band trails. The label the printer knows is then
//   the physical ticket, and presenting its boundary puts the perforation on the tear bar. The mark
//   moves to the other long edge, so the movable sensor has to follow it, and the ticket sits turned
//   half a turn under the head, which is why the block is drawn turned with it (ZPL_TURNED).
//
// ZPL_ORIGIN, how the label start is moved away from the mark:
// - `markOffset`: ^MNM,200 tells the printer the mark sits 25 mm into the document, which starts the
//   label at one end of the band and puts the whole band in reach: its inner edge with `bandFirst`,
//   the perforation with `bandLast`. The 4 mm bar starts 20 mm from the perforation, but the printer
//   measures to the edge that reaches the sensor first, its far one; 20 mm landed every boundary
//   about 5 mm short of the perforation, which a cutter showed and a tear hid.
// - `labelTop`: ^LT-120 shifts the format 15 mm, the command's floor, which leaves 35 of the 40 mm and
//   5 mm of white before the origin that nothing can print on. Only meaningful with `bandFirst`.
//
// The budget along the feed is the clearance at the origin, the block, and the clearance at the far
// end, and the stack decides which of those two ends is the perforation. Every millimetre given to one
// is taken from another.
const ZPL_STACK: 'bandFirst' | 'bandLast' = 'bandLast';
const ZPL_ORIGIN: 'labelTop' | 'markOffset' = 'markOffset';
const ORIGIN_SETUP = {
  labelTop: { artworkMm: 1, labelTopDots: -120, markOffsetDots: 0, perforationMm: 6, windowMm: 35 },
  markOffset: { artworkMm: 6, labelTopDots: 0, markOffsetDots: 200, perforationMm: 4, windowMm: 40 },
}[ZPL_ORIGIN];
const ZONE_CLEARANCES_MM = {
  bandFirst: { lead: ORIGIN_SETUP.artworkMm, trail: ORIGIN_SETUP.perforationMm },
  bandLast: { lead: ORIGIN_SETUP.perforationMm, trail: ORIGIN_SETUP.artworkMm },
}[ZPL_STACK];
const ZONE_LEAD_MM = ZONE_CLEARANCES_MM.lead;
const ZONE_TRAIL_MM = ZONE_CLEARANCES_MM.trail;
const ZONE_WIDTH_MM = ORIGIN_SETUP.windowMm - ZONE_LEAD_MM - ZONE_TRAIL_MM;

// Sized against the block, not in the abstract: the QR and the price share the block's length, so an
// 18 mm symbol left the price 10 mm and it silently stopped rendering once the block came down to
// 28 mm. Sixteen leaves the 30 mm block's price 14 mm, which a figure like `220,00 €` fits at its face.
const QR_SIZE_MM = 16;

// The stock is 72 mm across the print head and 152 mm along the feed, so the page, authored in the
// ticket's reading orientation, has to turn a quarter before it reaches the paper, and the other quarter
// with the stack loaded band last. The raster then lines up with the ZPL label dot for dot: its first
// row is the label origin, and the dual-screen prints it from there.
const RASTER_ROTATION: 90 | 270 = ({ bandFirst: 90, bandLast: 270 } as const)[ZPL_STACK];

// Scaled with the zone: these were calibrated against a 40 mm block. Overshooting only costs a
// wrapped line at the larger face, not an overflow, so they are estimates until a render settles
// them.
const PLAN_NAME_ONE_LINE_MAX_CHARS = 23;
const PLAN_NAME_MAX_CHARS = 42;

// The ticket type is free text from the plan, so on the ZPL path it steps down the way the plan name
// does. Measured at 203 dpi, its own face fits about 27 characters in the 30 mm block and the same
// height at a narrower width about 31; the thresholds keep a margin because the face is proportional.
// Longer than that it wraps onto a second line at the narrower width, and is cut to fit two.
const TICKET_TYPE_ONE_LINE_MAX_CHARS = 26;
const TICKET_TYPE_CONDENSED_MAX_CHARS = 30;
const TICKET_TYPE_MAX_CHARS = 52;

// The price steps down the same way, because it shares the block's length with the QR and comes from
// the pricing pipeline as text: `Invitación`, a loyalty figure, or a four-figure total can each outgrow
// its 14 mm. Measured at 203 dpi, its own face fits 8 characters and the narrower width 10; longer than
// that it wraps onto a second line beside the QR, and is cut to fit two.
const PRICE_ONE_LINE_MAX_CHARS = 8;
const PRICE_CONDENSED_MAX_CHARS = 10;
const PRICE_MAX_CHARS = 17;

// ZPL, for the Zebra Browser Print path. The dual-screen sends a rasterised image and the Android
// host owns the printer setup, so over there the origin is the registration mark and half the white
// band is out of reach. Over Browser Print the ZPL is ours, so the block is drawn as native fields:
// sharper at 203 dpi, a fraction of the payload, and the origin can be moved behind the mark.
const DOTS_PER_MM = 203 / 25.4;
const toDots = (mm: number): number => Math.round(mm * DOTS_PER_MM);

// ZPL's x runs across the print head and y along the feed. The stock is 72 mm across and 152 mm
// along, which is the page's height and width respectively, because the page is authored in the
// ticket's reading orientation.
const ZPL_PRINT_WIDTH_DOTS = toDots(STOCK_HEIGHT_MM);
const ZPL_LABEL_LENGTH_DOTS = toDots(STOCK_WIDTH_MM);

// The two commands the origin strategy above sets. With `labelTop` the offset is 0, which leaves the mark
// as the label boundary, and with `markOffset` the label top is 0, which leaves the format where the
// printer puts it.
const ZPL_LABEL_TOP_DOTS = ORIGIN_SETUP.labelTopDots;
const ZPL_MEDIA_TRACKING = `^MNM,${ORIGIN_SETUP.markOffsetDots}`;

// Tear-off adjustment. Left at zero: under either origin strategy the printer presents the label
// boundary it knows about, which is not this stock's perforation, and ~TA's 15 mm reach does not
// cover the distance between them.
const ZPL_TEAR_OFF = '~TA000';

// Backfeed sequence. With a cutter, normal backfeed retracts the paper after the last cut of a job and
// again before the next job's first label, which then starts about 19 mm early, runs past the next
// mark and makes the printer skip a ticket. Within a job the next label is already queued, so it only
// retracts once. Backfeeding entirely before each label retracts once in both cases. Tear-off keeps the
// normal sequence, which validated as is. The dual-screen asks the Android host for the same sequence.
const ZPL_BACKFEED_COMMANDS: Readonly<Record<PrintImagesBackfeedSequence, string>> = { before: '~JSB', normal: '~JSN' };

// Darkness, following the small ticket rather than the dual-screen's 24, because 15 is what the
// box-office printers report as their calibrated level.
const ZPL_DARKNESS = '~SD15';

// Which quarter turn the fields take. The block reads along the feed, so the fields cannot be left
// upright. `R` reads the right way up with the band leading; turning the stack turns the ticket half a
// turn, so the same block needs the opposite quarter turn.
const ZPL_FIELD_ROTATION: 'B' | 'R' = ({ bandFirst: 'R', bandLast: 'B' } as const)[ZPL_STACK];

// Whether the block is drawn turned half a turn, mirrored across the head and along its own length.
// It is laid out for the band leading and turned for the band trailing, so that relative to the ticket
// nothing moves: the plan name still reads at the top, clear of the pre-printed crest.
const ZPL_TURNED: boolean = { bandFirst: false, bandLast: true }[ZPL_STACK];

// Font heights in dots, a point (3 dots) above what the pdfmake styles use at 203 dpi, which printed
// smaller than the reference ticket. The price keeps its size.
const ZPL_FONT_PLAN_NAME = 26;
const ZPL_FONT_PLAN_NAME_SMALL = 21;
const ZPL_FONT_BODY = 23;
const ZPL_FONT_PRICE = 31;

// The plan name grows in height only. ^A0 scales the two independently, and at its own width a
// 21-character name no longer fits the block on one line.
const ZPL_FONT_PLAN_NAME_WIDTH = 22;

// The narrower width a long ticket type takes: the same height, 19 dots across instead of 22.
const ZPL_FONT_BODY_CONDENSED_WIDTH = 19;

// The narrower width a long price takes: the same height, 24 dots across instead of 30.
const ZPL_FONT_PRICE_CONDENSED_WIDTH = 24;

// Across the print head: the clearance from the media edge the block starts at, and the gap left
// between lines on top of each line's own height. The stack runs from the far edge downwards because
// x grows towards the top of the ticket, which the first print settled: anchoring at x = 0 put the
// plan name at the bottom, on top of the pre-printed crest.
const ZPL_BLOCK_X_DOTS = toDots(9);
const ZPL_LINE_GAP_DOTS = 6;

// Extra space before the ids and before the price, which groups the block the way the reference ticket
// does: what the ticket is, who it belongs to, what it cost. It is taken from the room above the
// pre-printed crest, which is what bounds how far the block can grow downwards.
const ZPL_GROUP_GAP_DOTS = toDots(3);

// The QR's module magnification. Five dots a module puts the version-2 symbol a 20-character order code
// needs at 15.6 mm, inside the box above; four put it at 12.5 mm.
const ZPL_QR_MAGNIFICATION = 5;
const ZPL_QR_SIZE_DOTS = toDots(QR_SIZE_MM);

// ^BQ draws its symbol 10 dots across the head from its ^FO under every rotation but R, measured on
// renders; the page reproduces it so the symbol lands where the label puts it.
const ZPL_QR_OFFSET_DOTS = ZPL_TURNED ? 10 : 0;

// Along the feed: where the block starts, measured from the label origin.
const ZPL_BLOCK_Y_DOTS = toDots(ZONE_LEAD_MM);

// The plan name reaches 4 mm further, into the clearance to the artwork, which leaves it 2 mm short of
// the artwork and gives the longest text on the ticket the most room.
const ZPL_PLAN_NAME_EXTEND_DOTS = toDots(4);

// Along the feed, the block with its clearances either side, which is what the turn mirrors about.
const ZPL_BLOCK_SPAN_DOTS = 2 * ZPL_BLOCK_Y_DOTS + toDots(ZONE_WIDTH_MM);

// From the ZPL's frame before the turn to the page's reading orientation, in dots.
const readingX = (y: number): number => (ZPL_TURNED ? ZPL_LABEL_LENGTH_DOTS - ZPL_BLOCK_SPAN_DOTS : 0) + y;
const readingY = (x: number): number => ZPL_PRINT_WIDTH_DOTS - x;

interface ZplRow {
  justification: 'C' | 'L' | 'R';
  lines: number;
  size: number;
  text: string;
  extendDots?: number;
  fontWidth?: number;
  pdfFontSize?: number;
  pdfLines?: number;
  pdfScale?: number;
  pdfText?: string;
  spaceBefore?: number;
}

// The block laid out once, for both renderers, in the frame the ZPL path computes before it turns: a
// text field by the baseline of its last line across the head, starting at `y` along the feed and
// running `span` dots, and the QR by its near corner.
interface BlockField {
  fontWidth: number;
  justification: 'C' | 'L' | 'R';
  lines: number;
  pdfScale: number;
  size: number;
  span: number;
  text: string;
  x: number;
  y: number;
  pdfFontSize?: number;
  pdfLines?: number;
  pdfText?: string;
}

interface BlockLayout {
  fields: BlockField[];
  qr: { code: string; x: number; y: number } | null;
}

// The pdfmake page carries the same block for the dual-screen raster and the PDF download. ^A0 is a
// condensed face and the document fonts are not, so the page sizes each field by the width the ZPL
// gives it rather than its height, scaled down until the character counts the ZPL thresholds allow fit
// the same span, and keeps each line the ZPL's height apart. The ascent places the first baseline where
// the ZPL puts it.
const PT_PER_DOT = 72 / 203;
const PDF_FONT_SCALE = 0.82;
const PDF_FONT_ASCENT = 1.165;

// pdfmake spaces lines at the font's own line height times `lineHeight`: ascent less descent, 1.34 em for
// Arial Unicode and 1.219 for Montserrat, read from the font files. Dividing by it puts each line exactly
// a pitch below the last.
const PDF_ARIAL_LINE_HEIGHT_EM = 1.34;
const PDF_MONTSERRAT_LINE_HEIGHT_EM = 1.219;

// The plan name and the ticket type read larger on the page than the width rule above gives them: the
// ticket type by a scale, the plan name at a set size. A text that no longer fits still shrinks to its
// lines.
const PDF_HEADLINE_SCALE = 1.15;
const PDF_PLAN_NAME_FONT_PT = 8;

// On the page the plan name takes up to three lines and the ticket type up to two, as many as the text
// needs, with a gap between the two. They stack upwards from the session row into the blank margin at
// the top of the band, so everything from the session down, the QR included, stays where the ZPL puts
// it, clear of the pre-printed crest below. Their lines are at least 1.2 of their size apart.
const PDF_PLAN_NAME_MAX_LINES = 3;
const PDF_TICKET_TYPE_MAX_LINES = 2;
const PDF_HEADLINE_GAP_DOTS = toDots(2);
const PDF_HEADLINE_LINE_SPACING = 1.2;

// How close the plan name may come to the top edge of the ticket; past it, it shrinks until it fits.
const PDF_TOP_MARGIN_DOTS = toDots(3);
const PDF_TICKET_TYPE_MIN_ONE_LINE_PT = 6;

// The document fonts are wider than ^A0, so a text that fits its ZPL lines can wrap onto one more on
// the page and land on the row below. Each field is shrunk until it wraps into the lines its row holds,
// estimated with the mean advance width of each character class in em, measured from each font's file.
// Checked against the fonts' real widths on thirty plan names and ticket types, none overflows within
// the 95% fill. The floor keeps it legible.
const PDF_FONT_MIN_PT = 4;
const PDF_LINE_FILL = 0.95;

interface CharWidths {
  digit: number;
  lower: number;
  lowerNarrow: number;
  lowerWide: number;
  other: number;
  paren: number;
  punct: number;
  space: number;
  upper: number;
  upperWide: number;
}

const ARIAL_WIDTHS: CharWidths = {
  digit: 0.556,
  lower: 0.495,
  lowerNarrow: 0.222,
  lowerWide: 0.778,
  other: 0.665,
  paren: 0.319,
  punct: 0.263,
  space: 0.278,
  upper: 0.658,
  upperWide: 0.888,
};

const MONTSERRAT_WIDTHS: CharWidths = {
  digit: 0.6,
  lower: 0.589,
  lowerNarrow: 0.289,
  lowerWide: 0.986,
  other: 0.732,
  paren: 0.363,
  punct: 0.254,
  space: 0.276,
  upper: 0.703,
  upperWide: 1.049,
};

function estimateWidthEm(text: string, widths: CharWidths): number {
  let width = 0;
  for (const char of text) {
    if (char === ' ') {
      width += widths.space;
    } else if (/[0-9]/.test(char)) {
      width += widths.digit;
    } else if (/[.,:;!'|]/.test(char)) {
      width += widths.punct;
    } else if (/[()\-/]/.test(char)) {
      width += widths.paren;
    } else if (char !== char.toLowerCase()) {
      width += char === 'M' || char === 'W' ? widths.upperWide : widths.upper;
    } else if (char !== char.toUpperCase()) {
      if (char === 'm' || char === 'w') {
        width += widths.lowerWide;
      } else {
        width += char === 'i' || char === 'l' ? widths.lowerNarrow : widths.lower;
      }
    } else {
      width += widths.other;
    }
  }
  return width;
}

// Lines a greedy word wrap takes at a line width in em, the way pdfmake breaks text.
function wrappedLines(text: string, lineWidthEm: number, widths: CharWidths): number {
  let lines = 1;
  let current = 0;
  for (const word of text.split(' ')) {
    const wordWidth: number = estimateWidthEm(word, widths);
    const next: number = current === 0 ? wordWidth : current + widths.space + wordWidth;
    if (next <= lineWidthEm || current === 0) {
      current = next;
    } else {
      lines++;
      current = wordWidth;
    }
  }
  return lines;
}

@Injectable({
  providedIn: 'root',
})
export class TicketPrePrintedFrontGeneratorService extends TicketGeneratorService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #zebraPrinterService = inject(ZebraPrinterService);

  protected override getRasterRotation(): 0 | 90 | 180 | 270 {
    return RASTER_ROTATION;
  }

  protected override getRasterWidthMm(): number {
    return STOCK_WIDTH_MM;
  }

  // The backfeed sequence this stock prints with, on Browser Print and on the dual-screen alike: before each
  // label when the box office cuts, normal when it tears.
  getBackfeedSequence(shouldCut: boolean): PrintImagesBackfeedSequence {
    return shouldCut ? 'before' : 'normal';
  }

  // How far from the black mark each label starts, which the dual-screen needs on `print-images` for its
  // raster to land where the ZPL does.
  getMarkOffsetDots(): number {
    return ORIGIN_SETUP.markOffsetDots;
  }

  async print(orders: { order: Order; isHidePriceEnabled?: boolean; isUnifiedTicket?: boolean }[]): Promise<void> {
    if (this.isNotPrintableOrders(orders.map(o => o.order))) {
      return;
    }
    const mappedOrders = this.withDefaultIsUnifiedTicket(orders);

    // No Zebra on this box office means no Browser Print daemon to talk to, so the ticket falls back
    // to the PDF the dual-screen path renders. It is also what makes the layout iterable without
    // consuming stock.
    if (!this.#isZebraPrinter()) {
      await firstValueFrom(this.downloadTickets(mappedOrders));
      return;
    }

    const zpl: string = this.#getZpl(mappedOrders);
    if (zpl.length === 0) {
      return;
    }

    await this.#sendZpl(zpl, mappedOrders);
  }

  // Every node is placed absolutely on the page at the position the ZPL gives it, so the raster the
  // dual-screen prints and the label Browser Print prints carry the block in the same place.
  protected getTicket(order: PrinterOrder): PdfTableContent {
    const layout: BlockLayout = this.#getBlockLayout(order, Array.from(this.pdfRenderAccessTickets?.values() ?? []));
    const nodes: JsonObject[] = this.#getPdfFields(layout.fields);
    if (layout.qr) {
      nodes.push(this.#getPdfQr(layout.qr.code, layout.qr.x, layout.qr.y));
    }

    return new PdfTableContent({
      content: {
        body: [[{ stack: nodes }]],
        widths: ['*'],
      },
      layout: 'noBorders',
    });
  }

  protected initializeDocument(): void {
    this.styles = {};

    this.document = {
      content: this.content,
      defaultStyle: {
        font: this.useMontserratFont ? 'Montserrat' : 'ArialUnicode',
      },
      pageMargins: [0, 0, 0, 0],
      pageSize: { height: STOCK_HEIGHT_MM * PT_PER_MM, width: STOCK_WIDTH_MM * PT_PER_MM },
      styles: this.styles,
    };
  }

  // Asks the operator what to do with a send that failed, with the small ticket's wording: retry, or
  // download the PDF. The confirmation cannot be dismissed, so it always resolves to one of the two.
  // The error texts carry markup for the legacy modal and this one renders plain text.
  #askToRetry(error: unknown): Promise<boolean> {
    const errorId: string = String(error).includes('Failed to fetch') ? PrinterErrors.FailedToFetchError : String(error);
    const message: string = [
      this.translateService.instant(`boxOffice.order.zebraPrinter.errors.${errorId}`),
      this.translateService.instant('boxOffice.order.zebraPrinter.question'),
    ]
      .join('\n')
      .replace(/<[^>]+>/g, '');
    const translations = signal({
      cancelButton: this.translateService.instant('boxOffice.order.zebraPrinter.buttons.download'),
      okButton: this.translateService.instant('boxOffice.order.zebraPrinter.buttons.retry'),
    });
    const dialog = this.#dialogService.openConfirmModal(this.translateService.instant('boxOffice.order.zebraPrinter.title'), message, {
      injector: Injector.create({ parent: this.#injector, providers: [{ provide: IGNT_DIALOG_TRANSLATIONS, useValue: translations }] }),
    });
    return firstValueFrom(dialog.closed$).then((shouldRetry: boolean | undefined) => shouldRetry === true);
  }

  // The ZPL face's size scaled to the document font, shrunk until the text wraps into `maxLines`, and the
  // lines it then takes.
  #fitPdfField(field: BlockField, maxLines: number, scale: number = 1): { fontSize: number; lines: number } {
    const widths: CharWidths = this.useMontserratFont ? MONTSERRAT_WIDTHS : ARIAL_WIDTHS;
    const span: number = field.span * PT_PER_DOT * PDF_LINE_FILL;
    let fontSize: number = scale * (field.pdfFontSize ?? (field.fontWidth + 1) * PT_PER_DOT * PDF_FONT_SCALE * field.pdfScale);
    const text: string = field.pdfText ?? field.text;
    while (fontSize > PDF_FONT_MIN_PT && wrappedLines(text, span / fontSize, widths) > maxLines) {
      fontSize = Math.max(PDF_FONT_MIN_PT, fontSize * 0.95);
    }
    return { fontSize, lines: Math.min(maxLines, wrappedLines(text, span / fontSize, widths)) };
  }

  // The block, stacked across the print head. Each row reads along the feed, so x advances row by row
  // and every row starts at the same y. Both renderers draw from this, so the ZPL label and the pdfmake
  // page carry the same ticket.
  #getBlockLayout(order: PrinterOrder, accessTickets: AccessTicket[]): BlockLayout {
    const zoneDots: number = toDots(ZONE_WIDTH_MM);
    const planName: string = this.truncateText(order.plan.name.toUpperCase(), PLAN_NAME_MAX_CHARS);
    const isLongName: boolean = planName.length > PLAN_NAME_ONE_LINE_MAX_CHARS;
    const ticketType: string = this.truncateText(order.tickets[0]?.label ?? '', TICKET_TYPE_MAX_CHARS);

    const ticketIdRows: ZplRow[] =
      order.ticketId === undefined
        ? []
        : [{ justification: 'R', lines: 1, size: ZPL_FONT_BODY, text: `${this.ticketIdTranslation}: ${order.ticketId}` }];
    const rows: ZplRow[] = [
      {
        extendDots: ZPL_PLAN_NAME_EXTEND_DOTS,
        fontWidth: isLongName ? ZPL_FONT_PLAN_NAME_SMALL - 1 : ZPL_FONT_PLAN_NAME_WIDTH,
        justification: 'C',
        lines: 2,
        pdfFontSize: PDF_PLAN_NAME_FONT_PT,
        pdfLines: PDF_PLAN_NAME_MAX_LINES,
        pdfText: order.plan.name.toUpperCase(),
        size: isLongName ? ZPL_FONT_PLAN_NAME_SMALL : ZPL_FONT_PLAN_NAME,
        text: planName,
      },
      {
        fontWidth: ticketType.length > TICKET_TYPE_ONE_LINE_MAX_CHARS ? ZPL_FONT_BODY_CONDENSED_WIDTH : ZPL_FONT_BODY - 1,
        justification: 'C',
        lines: ticketType.length > TICKET_TYPE_CONDENSED_MAX_CHARS ? 2 : 1,
        pdfLines: PDF_TICKET_TYPE_MAX_LINES,
        pdfScale: PDF_HEADLINE_SCALE,
        size: ZPL_FONT_BODY,
        text: ticketType,
      },
      { justification: 'C', lines: 1, size: ZPL_FONT_BODY, text: this.#getSessionText(order) },
      {
        justification: 'R',
        lines: 1,
        size: ZPL_FONT_BODY,
        spaceBefore: ZPL_GROUP_GAP_DOTS,
        text: `${this.orderIdTranslation}: ${order.orderId || ''}`,
      },
      ...ticketIdRows,
    ];

    const fields: BlockField[] = [];
    let x: number = ZPL_PRINT_WIDTH_DOTS - ZPL_BLOCK_X_DOTS;
    for (const row of rows) {
      x -= (row.spaceBefore ?? 0) + row.size * row.lines + ZPL_LINE_GAP_DOTS;
      if (row.text.length > 0) {
        const { justification, lines, size, text } = row;
        const pdfScale: number = row.pdfScale ?? 1;
        const extendDots: number = row.extendDots ?? 0;
        fields.push({
          fontWidth: row.fontWidth ?? size - 1,
          justification,
          lines,
          pdfFontSize: row.pdfFontSize,
          pdfLines: row.pdfLines,
          pdfScale,
          pdfText: row.pdfText,
          size,
          span: zoneDots + extendDots,
          text,
          x,
          y: ZPL_BLOCK_Y_DOTS - extendDots,
        });
      }
    }

    // The price sits beside the QR, as on the reference ticket: the price at the near end of the
    // block's length, left-aligned, the symbol at the far end, and the price centred against the
    // symbol across the head. The 30 mm block leaves the price 14 mm.
    const price: string = this.truncateText(this.#getTotalPrice(order, accessTickets), PRICE_MAX_CHARS);
    const priceLines: number = price.length > PRICE_CONDENSED_MAX_CHARS ? 2 : 1;
    const priceFontWidth: number = price.length > PRICE_ONE_LINE_MAX_CHARS ? ZPL_FONT_PRICE_CONDENSED_WIDTH : ZPL_FONT_PRICE - 1;
    const priceSpan: number = zoneDots - ZPL_QR_SIZE_DOTS;
    x -= ZPL_GROUP_GAP_DOTS + ZPL_QR_SIZE_DOTS + ZPL_LINE_GAP_DOTS;
    if (price.length > 0) {
      fields.push({
        fontWidth: priceFontWidth,
        justification: 'L',
        lines: priceLines,
        pdfScale: 1,
        size: ZPL_FONT_PRICE,
        span: priceSpan,
        text: price,
        x: x + (ZPL_QR_SIZE_DOTS - ZPL_FONT_PRICE * priceLines) / 2,
        y: ZPL_BLOCK_Y_DOTS,
      });
    }

    const qr = order.code ? { code: order.code, x, y: ZPL_BLOCK_Y_DOTS + priceSpan } : null;
    return { fields, qr };
  }

  // A field on the page, in the ticket's reading orientation. The raster turns the page onto the head
  // so that the page's y is the ZPL's x after the turn and its x runs back from the label origin, which
  // is what readingX and readingY undo. `baseline` is where its last line sits, `lines` lines of `pitch`
  // dots fill the box above it, and the first baseline lands where the ZPL puts it.
  #getPdfField(field: BlockField, fontSize: number, lines: number, baseline: number, pitch: number = field.size): JsonObject {
    const boxTop: number = baseline - pitch * lines;
    const alignment = { C: 'center', L: 'left', R: 'right' }[field.justification];
    return {
      absolutePosition: {
        x: readingX(field.y) * PT_PER_DOT,
        y: (boxTop + pitch) * PT_PER_DOT - PDF_FONT_ASCENT * fontSize,
      },
      columns: [
        {
          alignment,
          bold: true,
          fontSize,
          lineHeight:
            (pitch * PT_PER_DOT) / (fontSize * (this.useMontserratFont ? PDF_MONTSERRAT_LINE_HEIGHT_EM : PDF_ARIAL_LINE_HEIGHT_EM)),
          text: field.pdfText ?? field.text,
          width: field.span * PT_PER_DOT,
        },
      ],
    };
  }

  // Rows from the session down keep the ZPL's positions. The plan name and the ticket type, which carry
  // `pdfLines`, stack upwards from the first of them, each taking the lines its text needs.
  #getPdfFields(fields: BlockField[]): JsonObject[] {
    const headlines: BlockField[] = fields.filter((field: BlockField) => field.pdfLines !== undefined);
    const rows: BlockField[] = fields.filter((field: BlockField) => field.pdfLines === undefined);
    const nodes: JsonObject[] = rows.map((field: BlockField) =>
      this.#getPdfField(field, this.#fitPdfField(field, field.lines).fontSize, field.lines, readingY(field.x)),
    );

    const firstRow: BlockField | undefined = rows[0];
    const top: number = firstRow ? readingY(firstRow.x) - firstRow.size * firstRow.lines - ZPL_LINE_GAP_DOTS : readingY(0);
    // Past the top margin the ticket type gives way first, down to one line as long as it stays legible,
    // and only then the plan name shrinks.
    let headlineNodes: JsonObject[] = [];
    for (let planNameScale = 1; ; planNameScale *= 0.95) {
      let fitted = false;
      for (const ticketTypeLines of [PDF_TICKET_TYPE_MAX_LINES, 1]) {
        let baseline: number = top;
        let fits = true;
        headlineNodes = [];
        [...headlines].reverse().forEach((field: BlockField, index: number) => {
          if (index > 0) {
            baseline -= PDF_HEADLINE_GAP_DOTS;
          }
          const isPlanName: boolean = index === headlines.length - 1;
          const maxLines: number = isPlanName ? (field.pdfLines ?? field.lines) : Math.min(ticketTypeLines, field.pdfLines ?? field.lines);
          const { fontSize, lines } = this.#fitPdfField(field, maxLines, isPlanName ? planNameScale : 1);
          if (!isPlanName && fontSize < PDF_TICKET_TYPE_MIN_ONE_LINE_PT && maxLines < (field.pdfLines ?? field.lines)) {
            fits = false;
          }
          const pitch: number = Math.max(field.size, Math.ceil((fontSize * PDF_HEADLINE_LINE_SPACING) / PT_PER_DOT));
          headlineNodes.unshift(this.#getPdfField(field, fontSize, lines, baseline, pitch));
          baseline -= pitch * lines;
        });
        if (fits && baseline >= PDF_TOP_MARGIN_DOTS) {
          fitted = true;
          break;
        }
      }
      if (fitted || planNameScale * PDF_PLAN_NAME_FONT_PT <= PDF_FONT_MIN_PT) {
        break;
      }
    }
    return [...headlineNodes, ...nodes];
  }

  // The symbol where ^BQ prints it, module by module at the ZPL's magnification: pdfmake's own QR rounds
  // its modules to whole points, which at 203 dpi is either half or a third larger than the label's.
  #getPdfQr(code: string, x: number, y: number): JsonObject {
    const modules = QRCode.create(code, { errorCorrectionLevel: 'Q' }).modules;
    const symbol: number = modules.size * ZPL_QR_MAGNIFICATION;
    const left: number = ZPL_TURNED ? readingX(y) + ZPL_QR_SIZE_DOTS - symbol : readingX(y);
    const top: number = ZPL_TURNED ? readingY(x) - ZPL_QR_SIZE_DOTS + ZPL_QR_OFFSET_DOTS : readingY(x) - symbol;
    const moduleSize: number = ZPL_QR_MAGNIFICATION * PT_PER_DOT;

    // One rectangle per run of dark modules in a row.
    const runs: JsonObject[] = [];
    for (let row = 0; row < modules.size; row++) {
      let start = -1;
      for (let column = 0; column <= modules.size; column++) {
        const isDark: boolean = column < modules.size && modules.get(row, column) === 1;
        if (isDark && start < 0) {
          start = column;
        } else if (!isDark && start >= 0) {
          runs.push({
            color: 'black',
            h: moduleSize,
            type: 'rect',
            w: (column - start) * moduleSize,
            x: start * moduleSize,
            y: row * moduleSize,
          });
          start = -1;
        }
      }
    }

    return { absolutePosition: { x: left * PT_PER_DOT, y: top * PT_PER_DOT }, canvas: runs };
  }

  #getSessionText(order: PrinterOrder): string {
    const granularity: TicketTimeGranularity | null = this.getEffectiveBookingTimeGranularity(order);
    if (granularity === TicketTimeGranularity.ANYTIME) {
      return '';
    }
    const date: string = order.session.startsAtDateShortFormat;
    return granularity === TicketTimeGranularity.DATE_AND_TIME ? `${date} - ${order.session.startsAtTime}` : date;
  }

  // A hidden price, an invitation and a loyalty price are already resolved into the pipeline's first
  // pricing row, so those three cases are taken from it verbatim: printing the raw ticket total
  // instead would leak a reseller's price and would show money where the label belongs. Only the
  // ordinary case is rebuilt here, because the pipeline words it with the unit price and surcharge
  // and the block has room for one figure.
  //
  // The tickets arrive as an argument rather than off pdfRenderAccessTickets, because that field is
  // only populated inside the pdfmake render and the ZPL path would otherwise price every ticket at
  // nothing.
  #getTotalPrice(order: PrinterOrder, accessTickets: AccessTicket[]): string {
    if (accessTickets.length === 0) {
      return '';
    }
    if (this.#hasPipelineResolvedPrice(order, accessTickets)) {
      return order.pricing.totalFirstRow;
    }
    const amount: number = accessTickets.reduce(
      (total: number, ticket: AccessTicket) => total + ticket.total.amount - getDiscountApplied(ticket).amount,
      0,
    );
    return new Money(amount, accessTickets[0].total.currency).toString(this.locale);
  }

  // One label per access ticket, the way the small ticket walks them, so a multi-ticket order yields
  // one physical ticket each and only the last one cuts, or every one on a plan with
  // `zebra_printer_cut_every_ticket`, as on the other layouts.
  #getZpl(orders: { order: Order; isHidePriceEnabled?: boolean; isUnifiedTicket?: boolean }[]): string {
    const onsiteSetup: OnsiteSetup | null = this.#onsiteSetupsStorageService.getConfiguration();
    const shouldCut: boolean = onsiteSetup?.cutter_type === CutterTypeEnum.basic_cutter;
    let zpl = '';

    for (const { isHidePriceEnabled, isUnifiedTicket, order } of orders) {
      const accessTickets: Map<string, AccessTicket> | undefined = order.accessTickets;
      // An order with no tickets has nothing to print; skipping it keeps the rest of the batch, the
      // way the pdfmake path does.
      if (!accessTickets?.size) {
        continue;
      }

      if (isUnifiedTicket === true) {
        const printerOrder: PrinterOrder = this.generatePrinterOrder(order, accessTickets, undefined, isHidePriceEnabled);
        zpl += this.#getZplTicket(printerOrder, Array.from(accessTickets.values()), true, shouldCut);
        continue;
      }

      const cutEveryTicket: boolean =
        this.optimizelyService.isFeatureEnabled(FeatureFlags.ZEBRA_PRINTER_CUT_EVERY_TICKET, {
          plan_id: order.planId?.toString() ?? '',
        }) ?? false;
      let index = 0;
      accessTickets.forEach((accessTicket: AccessTicket) => {
        index++;
        const ticketMap: Map<string, AccessTicket> = new Map([[accessTicket.id.toString(), accessTicket]]);
        const printerOrder: PrinterOrder = this.generatePrinterOrder(order, ticketMap, index, isHidePriceEnabled);
        zpl += this.#getZplTicket(printerOrder, [accessTicket], index === accessTickets.size || cutEveryTicket, shouldCut);
      });
    }

    return zpl;
  }

  // Positions are worked out for the band leading and turned half a turn about the block's centre when
  // ZPL_TURNED. ^FT anchors a baseline start, so a text anchor turns onto a point, and the opposite
  // field rotation runs the text back along the same span. ^FO places a box by its near corner, so the
  // QR's box turns onto its opposite corner.
  #getZplBlock(order: PrinterOrder, accessTickets: AccessTicket[]): string {
    const layout: BlockLayout = this.#getBlockLayout(order, accessTickets);
    const turnX = (x: number): number => (ZPL_TURNED ? ZPL_PRINT_WIDTH_DOTS - x : x);
    const turnY = (y: number): number => (ZPL_TURNED ? ZPL_BLOCK_SPAN_DOTS - y : y);

    let zpl = '';
    for (const field of layout.fields) {
      const block = `^FB${field.span},${field.lines},,${field.justification}`;
      zpl += this.#getZplField(turnX(field.x), turnY(field.y), field.text, field.size, block, field.fontWidth);
    }
    if (layout.qr) {
      const { code, x, y } = layout.qr;
      zpl += ZPL_TURNED ? this.#getZplQr(turnX(x + ZPL_QR_SIZE_DOTS), turnY(y + ZPL_QR_SIZE_DOTS), code) : this.#getZplQr(x, y, code);
    }

    return zpl;
  }

  // ^FT anchors text on its baseline, which is what the stacking above assumes.
  #getZplField(x: number, y: number, text: string, fontHeight: number, block: string = '', fontWidth: number = fontHeight - 1): string {
    return `${block}^FT${Math.round(x)},${Math.round(y)}^A0${ZPL_FIELD_ROTATION},${fontHeight},${fontWidth}^CI28^FD${text}^FS^CI27\n`;
  }

  // Two formats, as the small ticket does it: the first carries the printer settings and persists
  // them with ^JUS, the second carries the label. ^LT and the ^MN offset are what move the origin
  // behind the mark, so they belong in the persisted half. Orientation, mirroring and reverse are pinned there too: the small
  // ticket persists ^POI on the same printers, and a format that leaves them out inherits it and
  // prints upside down at the far end of the ticket.
  #getZplHeader(shouldCut: boolean, isLast: boolean): string {
    return [
      '^XA',
      ZPL_TEAR_OFF,
      ZPL_BACKFEED_COMMANDS[this.getBackfeedSequence(shouldCut)],
      `^LT${ZPL_LABEL_TOP_DOTS}`,
      ZPL_MEDIA_TRACKING,
      '^MTD',
      '^PON',
      '^PMN',
      '^LRN',
      '^LH0,0',
      '^LS0',
      ZPL_DARKNESS,
      '^JUS',
      '^CI28',
      '^XZ',
      '^XA',
      shouldCut && isLast ? '^MMC' : '^MMT',
      `^PW${ZPL_PRINT_WIDTH_DOTS}`,
      `^LL${ZPL_LABEL_LENGTH_DOTS}`,
    ].join('\n');
  }

  // ^FO rather than ^FT, because a symbol is easier to reason about by its box than by a baseline: ^FO
  // places the symbol's near corner and it grows away from the origin from there.
  #getZplQr(x: number, y: number, code: string): string {
    return `^FO${Math.round(x)},${Math.round(y)}^BQ${ZPL_FIELD_ROTATION},2,${ZPL_QR_MAGNIFICATION}^FDQA,${code}^FS\n`;
  }

  #getZplTicket(order: PrinterOrder, accessTickets: AccessTicket[], isLast: boolean, shouldCut: boolean): string {
    return `${this.#getZplHeader(shouldCut, isLast)}\n${this.#getZplBlock(order, accessTickets)}^PQ1,0,1,Y\n^XZ\n`;
  }

  // Both rows empty is how the pipeline expresses a hidden price; there is no flag on PrinterOrder
  // to read instead.
  #hasPipelineResolvedPrice(order: PrinterOrder, accessTickets: AccessTicket[]): boolean {
    const isPriceHidden: boolean = order.pricing.totalFirstRow === '' && order.pricing.totalSecondRow === '';
    const isInvitation: boolean = accessTickets.some((ticket: AccessTicket) => ticket.showInvitationLabel);
    const hasLoyaltyPrice: boolean = accessTickets.some(
      (ticket: AccessTicket) => ticket.loyaltyUnitPrice != null && ticket.loyaltyUnitPrice !== 0,
    );
    return isPriceHidden || isInvitation || hasLoyaltyPrice;
  }

  #isZebraPrinter(): boolean {
    return this.#onsiteSetupsStorageService.getConfiguration()?.obo_printer_type === OboPrinterTypeEnum.zebra_printer_v2;
  }

  // A failed send is not left to the caller, which shows nothing: the operator is asked to retry, against
  // whichever printer Browser Print resolves then, or to download the PDF, as on the small ticket. The
  // print resolves once the ZPL is sent or the dialog is open.
  async #sendZpl(zpl: string, orders: { order: Order; isUnifiedTicket?: boolean }[], afterRetry: boolean = false): Promise<void> {
    const orderIds: (number | undefined)[] = orders.map(o => o.order.id);
    try {
      await this.#zebraPrinterService.getDefaultPrinter();
      await this.#zebraPrinterService.sendToPrinter(zpl, orderIds[0]);
      this.#datadogLogService.logInfo(`[PrePrintedFront] Sent ZPL for orders: ${orderIds.join(', ')}`, { afterRetry, orderIds });
    } catch (error) {
      this.#datadogLogService.logError(`[PrePrintedFront] Failed to send ZPL: ${error}`, { afterRetry, orderIds });
      this.#askToRetry(error).then((shouldRetry: boolean) =>
        shouldRetry ? this.#sendZpl(zpl, orders, true) : firstValueFrom(this.downloadTickets(orders)),
      );
    }
  }
}
