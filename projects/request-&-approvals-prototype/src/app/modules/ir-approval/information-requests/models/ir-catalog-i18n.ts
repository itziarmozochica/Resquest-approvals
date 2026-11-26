/**
 * Maps the IR catalog's canonical English form text (question/column label, section title, help text
 * or picklist option) to an i18n key under `informationRequests.catalog`. The form content is
 * snapshotted as English from the backend catalog, so it is translated at render time via
 * {@link IrCatalogKeyPipe} (`{{ text | irCatalogKey | translate }}`). Text with no mapping
 * (partner-added custom fields) falls through to the raw value.
 *
 * The `en` source values live in `src/assets/i18n/en.json` under `informationRequests.catalog`;
 * the other locales are supplied by Phrase. Keep this map and that namespace in sync.
 */
export const IR_CATALOG_KEY_BY_TEXT: Record<string, string> = {
  // ── Sections ──
  'Basic info': 'informationRequests.catalog.sections.basicInfo',
  'Basic Info': 'informationRequests.catalog.sections.basicInfo',
  Venues: 'informationRequests.catalog.sections.venues',
  Products: 'informationRequests.catalog.sections.products',
  Ticketing: 'informationRequests.catalog.sections.ticketing',
  Media: 'informationRequests.catalog.sections.media',
  'Post-purchase': 'informationRequests.catalog.sections.postPurchase',
  Timing: 'informationRequests.catalog.sections.timing',
  Content: 'informationRequests.catalog.sections.content',
  'Map Files': 'informationRequests.catalog.sections.mapFiles',
  Configuration: 'informationRequests.catalog.sections.configuration',
  'Brand Identity': 'informationRequests.catalog.sections.brandIdentity',
  'Media Assets': 'informationRequests.catalog.sections.mediaAssets',
  'Campaign Content': 'informationRequests.catalog.sections.campaignContent',
  'Entity Details': 'informationRequests.catalog.sections.entityDetails',
  Signatory: 'informationRequests.catalog.sections.signatory',
  Documents: 'informationRequests.catalog.sections.documents',
  Company: 'informationRequests.catalog.sections.company',
  Banking: 'informationRequests.catalog.sections.banking',
  Contact: 'informationRequests.catalog.sections.contact',

  // ── Field labels ──
  'Event name': 'informationRequests.catalog.fields.eventName',
  Description: 'informationRequests.catalog.fields.description',
  'Additional info': 'informationRequests.catalog.fields.additionalInfo',
  Venue: 'informationRequests.catalog.fields.venue',
  'Ticket types, capacity & pricing': 'informationRequests.catalog.fields.ticketTypes',
  'Event schedule': 'informationRequests.catalog.fields.eventSchedule',
  'Custom schedule (link or upload)': 'informationRequests.catalog.fields.customSchedule',
  Photos: 'informationRequests.catalog.fields.photos',
  Videos: 'informationRequests.catalog.fields.videos',
  'Post-purchase questions': 'informationRequests.catalog.fields.postPurchaseQuestions',
  FAQs: 'informationRequests.catalog.fields.faqs',
  'Go-live date': 'informationRequests.catalog.fields.goLiveDate',
  'Close date': 'informationRequests.catalog.fields.closeDate',
  'Seating map file (SVG/PDF)': 'informationRequests.catalog.fields.seatingMapFile',
  'Section labels': 'informationRequests.catalog.fields.sectionLabels',
  'Accessible sections': 'informationRequests.catalog.fields.accessibleSections',
  'Total capacity': 'informationRequests.catalog.fields.totalCapacity',
  'Special zones (VIP, boxes…)': 'informationRequests.catalog.fields.specialZones',
  'Main logo': 'informationRequests.catalog.fields.mainLogo',
  'Secondary logos': 'informationRequests.catalog.fields.secondaryLogos',
  Typefaces: 'informationRequests.catalog.fields.typefaces',
  'Color palette': 'informationRequests.catalog.fields.colorPalette',
  'Colour palette files': 'informationRequests.catalog.fields.colourPaletteFiles',
  Slogans: 'informationRequests.catalog.fields.slogans',
  'Brand guidelines': 'informationRequests.catalog.fields.brandGuidelines',
  Images: 'informationRequests.catalog.fields.images',
  Audio: 'informationRequests.catalog.fields.audio',
  'Venue images': 'informationRequests.catalog.fields.venueImages',
  'Other brand elements': 'informationRequests.catalog.fields.otherBrandElements',
  'Key selling points': 'informationRequests.catalog.fields.keySellingPoints',
  'Target audience': 'informationRequests.catalog.fields.targetAudience',
  'Additional notes': 'informationRequests.catalog.fields.additionalNotes',
  Logos: 'informationRequests.catalog.fields.logos',
  'Campaign slogan': 'informationRequests.catalog.fields.campaignSlogan',
  'Visual guideline (PDF)': 'informationRequests.catalog.fields.visualGuideline',
  'Legal entity name': 'informationRequests.catalog.fields.legalEntityName',
  'Tax ID / VAT number': 'informationRequests.catalog.fields.taxId',
  'Registered address': 'informationRequests.catalog.fields.registeredAddress',
  'Authorized signatory name': 'informationRequests.catalog.fields.authorizedSignatoryName',
  'Authorized signatory email': 'informationRequests.catalog.fields.authorizedSignatoryEmail',
  'Certificate of incorporation': 'informationRequests.catalog.fields.certificateOfIncorporation',
  'Contract template': 'informationRequests.catalog.fields.contractTemplate',
  'Additional legal documents': 'informationRequests.catalog.fields.additionalLegalDocuments',
  'Company name': 'informationRequests.catalog.fields.companyName',
  'Billing address': 'informationRequests.catalog.fields.billingAddress',
  'Bank account / IBAN': 'informationRequests.catalog.fields.bankAccountIban',
  'SWIFT / BIC': 'informationRequests.catalog.fields.swiftBic',
  'Primary contact name': 'informationRequests.catalog.fields.primaryContactName',
  'Primary contact email': 'informationRequests.catalog.fields.primaryContactEmail',
  'Company website': 'informationRequests.catalog.fields.companyWebsite',
  'Primary contact phone': 'informationRequests.catalog.fields.primaryContactPhone',

  // ── Grid (event schedule) column labels ──
  'Start date': 'informationRequests.catalog.gridColumns.startDate',
  'End date': 'informationRequests.catalog.gridColumns.endDate',
  'Doors open': 'informationRequests.catalog.gridColumns.doorsOpen',
  'Show start': 'informationRequests.catalog.gridColumns.showStart',
  'Show end (estimated)': 'informationRequests.catalog.gridColumns.showEnd',
  'Demand pricing': 'informationRequests.catalog.gridColumns.demandPricing',
  'Per-product demand': 'informationRequests.catalog.gridColumns.perProductDemand',

  // ── Table (ticket types / FAQ) column labels ──
  'Ticket Type': 'informationRequests.catalog.tableColumns.ticketType',
  Capacity: 'informationRequests.catalog.tableColumns.capacity',
  'Tax Name': 'informationRequests.catalog.tableColumns.taxName',
  'Tax Percent': 'informationRequests.catalog.tableColumns.taxPercent',
  Pricing: 'informationRequests.catalog.tableColumns.pricing',
  Question: 'informationRequests.catalog.tableColumns.question',
  Answer: 'informationRequests.catalog.tableColumns.answer',

  // ── Picklist options ──
  Peak: 'informationRequests.catalog.options.peak',
  Standard: 'informationRequests.catalog.options.standard',
  Mixed: 'informationRequests.catalog.options.mixed',
  Closed: 'informationRequests.catalog.options.closed',

  // ── Help text ──
  'Include event name, location and main point of sale when relevant.': 'informationRequests.catalog.help.eventName',
  'Format text and insert marketplace-compliant images (JPG/PNG, max 5 MB each).': 'informationRequests.catalog.help.description',
  'Optional complementary line with the title.': 'informationRequests.catalog.help.additionalInfo',
  'Search by venue name or address (Google Places), or enter all details manually.': 'informationRequests.catalog.help.venue',
  'Use the calendar (range stays highlighted), the middle panel for times and per-product Peak/Standard by weekday, optional date overrides, then append rows. “Mixed” appears when products use different bands the same day. You can still edit the table.':
    'informationRequests.catalog.help.eventSchedule',
  'Optional: share a Google Drive link or upload a schedule file. For Drive, integration.cm@example.com must have access. Only available for Diamond events or when enabled by an administrator.':
    'informationRequests.catalog.help.customSchedule',
  'JPG, JPEG, PNG, BMP, TIFF, TIF, SVG, PSD, CR2, DNG or NEF; max 5 GB per file (staging limits may apply). The Hub checks format and file size. Follow marketplace guidelines for quality (avoid collages; keep logos/text out of unsafe crop zones).':
    'informationRequests.catalog.help.photos',
  'MP4, MOV, AVI, WebM, MKV, M4V, MPEG, MPG or HEVC; max 15 seconds; max 5 GB per file (staging limits may apply). The Hub verifies format, duration, and size. On-screen logos/text/ad copy cannot be validated automatically — follow creative guidelines.':
    'informationRequests.catalog.help.videos',
  'Add at least 5 question & answer pairs (access, refunds, event info). Use + Add FAQ for more rows.':
    'informationRequests.catalog.help.faqs',
  'Include event name, city/venue and main point of sale when relevant.': 'informationRequests.catalog.help.eventNameCityVenue',
  'All sections with short code': 'informationRequests.catalog.help.sectionLabels',
  'PNG, SVG, AI or PSD. Only one file — use Replace to swap it.': 'informationRequests.catalog.help.mainLogo',
  'JPG, PNG, SVG, AI, EPS or PSD. Upload as many as you like.': 'informationRequests.catalog.help.secondaryLogos',
  'TTF, OTF, WOFF, WOFF2, PDF or ZIP.': 'informationRequests.catalog.help.typefaces',
  'HEX codes for all brand colors': 'informationRequests.catalog.help.colorPalette',
  'JPG, PNG, PDF, AI, PSD or ASE.': 'informationRequests.catalog.help.colourPaletteFiles',
  'PDF, PPT, PPTX, DOC, DOCX, ZIP or AI.': 'informationRequests.catalog.help.brandGuidelines',
  'At least 5 files. JPG, JPEG, PNG, BMP, TIFF, TIF, SVG, PSD, CR2, DNG or NEF.': 'informationRequests.catalog.help.images',
  'MP4, MOV, AVI, WebM, MKV, M4V, MPEG, MPG or HEVC.': 'informationRequests.catalog.help.videosFormats',
  'MP3, WAV, M4A, AAC, OGG or FLAC.': 'informationRequests.catalog.help.audio',
  'JPG, PNG, GIF, WebP, HEIC, HEIF, BMP, TIFF, SVG, PSD, CR2, DNG or NEF.': 'informationRequests.catalog.help.venueImages',
  'SVG + PNG, all variants': 'informationRequests.catalog.help.seatingMapVariants',
  'Peak / Standard / Closed / Mixed for the day (Mixed when products differ; matches composer).':
    'informationRequests.catalog.help.demandPricing',
  'JSON map product name → Peak | Standard | Closed. Filled by the schedule composer; editable.':
    'informationRequests.catalog.help.perProductDemand',
};
