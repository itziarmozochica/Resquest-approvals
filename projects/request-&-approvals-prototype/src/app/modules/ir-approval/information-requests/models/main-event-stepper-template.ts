import { ServiceCatalogCustomField } from '@fz-original/app/modules/admin-project-management-settings/models/service-catalog.model';

import { InformationRequestFileKind, InformationRequestQuestionType } from './information-request-question.model';
import { StepperTemplate } from './stepper-template.model';

/**
 * FeverZone equivalent of the ops-hub "Event · Main event" template (event_main_plan).
 * Sections map to wizard steps; the Event schedule field opts into the calendar composer
 * (config-driven via gridComposer + productSourceFieldId), sourcing products from ticket-types.
 */
export const MAIN_EVENT_TEMPLATE_KEY = 'main-event-default';

export const MAIN_EVENT_REQUEST_TEMPLATE_KEY = 'event_main_plan';

const customFields: ServiceCatalogCustomField[] = [
  // ── Basic info ──────────────────────────────────────────────
  {
    id: 'event-name',
    label: 'Event name',
    type: InformationRequestQuestionType.TEXT,
    section: 'basic-info',
    order: 0,
    required: true,
    helpText: 'Include event name, location and main point of sale when relevant.',
  },
  {
    id: 'description',
    label: 'Description',
    type: InformationRequestQuestionType.RICH_TEXT,
    section: 'basic-info',
    order: 1,
    required: true,
    helpText: 'Format text and insert marketplace-compliant images (JPG/PNG, max 5 MB each).',
    textareaMinRows: 4,
  },
  {
    id: 'additional-info',
    label: 'Additional info',
    type: InformationRequestQuestionType.TEXTAREA,
    section: 'basic-info',
    order: 2,
    required: false,
    helpText: 'Optional complementary line with the title.',
    textareaMinRows: 3,
  },
  {
    id: 'venue',
    label: 'Venue',
    type: InformationRequestQuestionType.VENUE,
    section: 'venues',
    order: 0,
    required: true,
    helpText: 'Search by venue name or address (Google Places), or enter all details manually.',
  },
  // ── Ticketing ───────────────────────────────────────────────
  {
    id: 'ticket-types',
    label: 'Products',
    type: InformationRequestQuestionType.TICKET_TYPES,
    section: 'ticketing',
    order: 0,
    required: true,
    helpText: 'Define the products to sell with their corresponding capacities, prices and taxes.',
    venueSourceFieldId: 'venue',
  },
  {
    id: 'event-schedule',
    label: 'Event schedule',
    type: InformationRequestQuestionType.CATALOG_GRID,
    section: 'ticketing',
    order: 1,
    required: true,
    helpText:
      'Use the calendar to set the range (closed days stay struck through), set times and per-product Peak/Standard demand by weekday. “Mixed” appears when products differ. You can still edit the table below.',
    gridMinRows: 1,
    gridComposer: 'event_schedule',
    productSourceFieldId: 'ticket-types',
    productNameColumn: 'ticketType',
    venueSourceFieldId: 'venue',
    gridColumns: [
      { id: 'startDate', label: 'Start date', type: 'date', defaultRequired: true },
      { id: 'endDate', label: 'End date', type: 'date', defaultRequired: true },
      { id: 'doorsOpen', label: 'Doors open', type: 'time', defaultRequired: true },
      { id: 'showStart', label: 'Show start', type: 'time', defaultRequired: true },
      { id: 'showEnd', label: 'Show end (estimated)', type: 'time', defaultRequired: false },
      { id: 'pricingTier', label: 'Demand pricing', type: 'picklist', defaultRequired: false },
    ],
    tableColumnPicklists: {
      pricingTier: ['', 'Peak', 'Standard', 'Mixed', 'Closed'],
    },
  },
  {
    id: 'custom-schedule',
    label: 'Custom schedule (link or upload)',
    type: InformationRequestQuestionType.FILE,
    section: 'ticketing',
    order: 2,
    required: false,
    helpText: 'Optional: share a Google Drive link or upload a schedule file.',
    fileRuleKind: 'any',
  },
  // ── Media ───────────────────────────────────────────────────
  {
    id: 'photos',
    label: 'Photos',
    type: InformationRequestQuestionType.MULTIFILE,
    section: 'media',
    order: 0,
    required: true,
    acceptedFileKinds: [InformationRequestFileKind.PHOTO],
    fileAccept: ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.svg', '.psd', '.cr2', '.dng', '.nef'],
    helpText:
      'Upload from your computer or paste a Google Drive file/folder link. JPG, JPEG, PNG, BMP, TIFF, TIF, SVG, PSD, CR2, DNG or NEF.',
  },
  {
    id: 'videos',
    label: 'Videos',
    type: InformationRequestQuestionType.MULTIFILE,
    section: 'media',
    order: 1,
    required: true,
    acceptedFileKinds: [InformationRequestFileKind.VIDEO],
    fileAccept: ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v', '.mpeg', '.mpg', '.hevc'],
    helpText: 'Upload from your computer or paste a Google Drive file/folder link. MP4, MOV, AVI, WebM, MKV, M4V, MPEG, MPG or HEVC.',
  },
  // ── Post-purchase ───────────────────────────────────────────
  {
    id: 'post-purchase',
    label: 'Post-purchase questions',
    type: InformationRequestQuestionType.TEXTAREA,
    section: 'post-purchase',
    order: 0,
    required: false,
    textareaMinRows: 3,
  },
  {
    id: 'faqs',
    label: 'FAQs',
    type: InformationRequestQuestionType.FAQ,
    section: 'post-purchase',
    order: 1,
    required: true,
    helpText: 'Add at least 5 question & answer pairs (access, refunds, event info).',
    faqMinPairs: 5,
    tableColumnTypes: { q: 'text', a: 'textarea' },
  },
];

export const MAIN_EVENT_TEMPLATE: StepperTemplate = {
  key: MAIN_EVENT_TEMPLATE_KEY,
  label: 'Main event',
  multiInstance: false,
  customFields,
  layout: {
    version: 1,
    sections: [
      {
        title: 'Basic info',
        rows: [{ columns: [['event-name'], ['description'], ['additional-info']] }],
      },
      {
        title: 'Venue',
        rows: [{ columns: [['venue']] }],
      },
      {
        title: 'Ticketing',
        rows: [{ columns: [['ticket-types'], ['event-schedule'], ['custom-schedule']] }],
      },
      {
        title: 'Media',
        rows: [{ columns: [['photos'], ['videos']] }],
      },
      {
        title: 'Post-purchase',
        rows: [{ columns: [['post-purchase'], ['faqs']] }],
      },
    ],
  },
};
