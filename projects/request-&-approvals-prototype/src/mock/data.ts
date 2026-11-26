/**
 * Seed data for the Requests & Approval prototype. Everything here is invented.
 * Edit freely to try other states: the shapes mirror the real API (snake_case DTOs).
 */
export const PARTNER_ID = 7532;
export const USER_ID = 1;

const day = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number): string => new Date(Date.now() + offsetDays * day).toISOString();

export const launches = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    partner_id: PARTNER_ID,
    salesforce_launch_id: 'a0X000000000001',
    launch_id_c: '12345',
    name: 'Madrid Spring Festival',
    event_date: iso(40),
    venue: 'Plaza Mayor',
    city: 'Madrid',
    country_code: 'ES',
    pm_email: 'pm@example.com',
    bd_email: 'bd@example.com',
    sales_launch_date: iso(-20),
    open_gates_date: iso(40),
    closed_gates_date: iso(41),
    lifecycle_status: 'UPCOMING',
    created_at: iso(-90),
    updated_at: iso(-3),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    partner_id: PARTNER_ID,
    salesforce_launch_id: 'a0X000000000002',
    launch_id_c: '54321',
    name: 'Barcelona Light Show',
    event_date: iso(75),
    venue: 'Parc del Fòrum',
    city: 'Barcelona',
    country_code: 'ES',
    pm_email: 'pm@example.com',
    bd_email: 'bd@example.com',
    sales_launch_date: iso(-5),
    open_gates_date: iso(75),
    closed_gates_date: iso(76),
    lifecycle_status: 'ACTIVE',
    created_at: iso(-60),
    updated_at: iso(-1),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    partner_id: PARTNER_ID,
    salesforce_launch_id: 'a0X000000000003',
    launch_id_c: '98765',
    name: 'Lisbon Rooftop Sessions',
    event_date: iso(120),
    venue: 'Terraço do Carmo',
    city: 'Lisbon',
    country_code: 'PT',
    pm_email: 'pm@example.com',
    bd_email: 'bd@example.com',
    sales_launch_date: iso(10),
    open_gates_date: iso(120),
    closed_gates_date: iso(121),
    lifecycle_status: 'UPCOMING',
    created_at: iso(-30),
    updated_at: iso(-2),
  },
];

const timeline = (status: string, author: string, comment: string, offsetDays: number): Record<string, unknown> => ({
  id: `tl-${status}-${offsetDays}`,
  status,
  author_email: author,
  comment,
  occurred_at: iso(offsetDays),
});

const informationRequest = (
  id: string,
  launchId: string,
  overrides: Record<string, unknown>,
): Record<string, unknown> => ({
  id,
  launch_id: launchId,
  partner_id: PARTNER_ID,
  type: 'CONTENT',
  title: 'Provide localized event description',
  description: 'We need both ES and EN copy, max 280 characters each.',
  status: 'PENDING',
  attachments: [],
  timeline: [timeline('PENDING', 'pm@example.com', 'Created by PM', -5)],
  created_by: 'pm@example.com',
  created_at: iso(-5),
  updated_at: iso(-2),
  ...overrides,
});

export const informationRequests = [
  informationRequest('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', launches[0].id, {}),
  informationRequest('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', launches[0].id, {
    title: 'Upload merchandise renders',
    type: 'ASSETS',
    status: 'IN_REVIEW',
    description: 'High resolution renders of every merchandise item, PNG with transparent background.',
    attachments: [
      { id: 'att-1', file_name: 'tote-bag.png', file_size: 482_113, uploaded_at: iso(-3) },
      { id: 'att-2', file_name: 'poster.png', file_size: 1_204_998, uploaded_at: iso(-3) },
    ],
    timeline: [
      timeline('PENDING', 'pm@example.com', 'Created by PM', -6),
      timeline('IN_REVIEW', 'partner@example.com', 'Files uploaded', -3),
    ],
  }),
  informationRequest('cccccccc-1111-4111-8111-cccccccccccc', launches[1].id, {
    title: 'Confirm venue capacity per zone',
    type: 'OPERATIONS',
    status: 'APPROVED',
    description: 'Capacity for the main stage, VIP area and food court.',
    timeline: [
      timeline('PENDING', 'pm@example.com', 'Created by PM', -12),
      timeline('IN_REVIEW', 'partner@example.com', 'Sent', -9),
      timeline('APPROVED', 'pm@example.com', 'All good', -7),
    ],
  }),
  informationRequest('dddddddd-1111-4111-8111-dddddddddddd', launches[2].id, {
    title: 'Safety plan and permits',
    type: 'LEGAL',
    status: 'REJECTED',
    description: 'Upload the signed safety plan and municipal permits.',
    timeline: [
      timeline('PENDING', 'pm@example.com', 'Created by PM', -10),
      timeline('IN_REVIEW', 'partner@example.com', 'Sent', -6),
      timeline('REJECTED', 'pm@example.com', 'The permit is expired, please send the current one.', -4),
    ],
  }),
];

const approval = (id: string, launchId: string, overrides: Record<string, unknown>): Record<string, unknown> => ({
  id,
  launch_id: launchId,
  partner_id: PARTNER_ID,
  status: 'SUBMITTED',
  available_actions: ['approve', 'reject', 'request_changes'],
  upload_method: 'link',
  title: 'Pricing table',
  approval_type: 'PRICING',
  description: 'Please review the ticket prices before the sales launch.',
  due_date: iso(7),
  drive_url: 'https://docs.google.com/spreadsheets/d/abcdef',
  assets: [],
  rows: [
    { id: 'row-1', row_index: 0, values: { 'Plan name': 'Madrid Spring Festival', Capacity: 1200 }, status: 'SUBMITTED' },
  ],
  timeline: [timeline('SUBMITTED', 'partner@example.com', 'Submitted for review', -4)],
  created_by: 'partner@example.com',
  created_at: iso(-4),
  updated_at: iso(-2),
  ...overrides,
});

export const approvals = [
  approval('cccccccc-cccc-cccc-cccc-cccccccccccc', launches[0].id, {}),
  approval('dddddddd-dddd-dddd-dddd-dddddddddddd', launches[0].id, {
    upload_method: 'computer',
    drive_url: undefined,
    status: 'IN_REVIEW',
    rows: [],
    assets: [{ id: 'asset-1', file_name: 'pricing-table.xlsx', file_size: 24_576, uploaded_at: iso(-3) }],
    timeline: [
      timeline('SUBMITTED', 'partner@example.com', 'Submitted for review', -5),
      timeline('IN_REVIEW', 'pm@example.com', 'Reviewing', -3),
    ],
  }),
  approval('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', launches[1].id, {
    upload_method: 'computer',
    drive_url: undefined,
    status: 'IN_REVIEW',
    rows: [],
    assets: [
      {
        id: 'asset-hero',
        file_name: 'hero-banner.png',
        file_size: 204_800,
        drive_file_id: 'drive-hero',
        drive_url: 'https://drive.google.com/file/d/drive-hero/view',
        drive_sync_status: 'IN_DRIVE',
        uploaded_at: iso(-2),
      },
    ],
    item_comments: {
      can_post: true,
      counts: { 'asset-hero': 2 },
      enabled: true,
      mentionable: [
        { email: 'jon@partner.com', name: 'Jon Garnica' },
        { email: 'marta@example.com', name: 'Marta Lopez' },
      ],
    },
  }),
  approval('ffffffff-ffff-ffff-ffff-ffffffffffff', launches[2].id, {
    status: 'APPROVED',
    available_actions: [],
    timeline: [
      timeline('SUBMITTED', 'partner@example.com', 'Submitted for review', -9),
      timeline('APPROVED', 'pm@example.com', 'Approved', -6),
    ],
  }),
];

export const approvalItemComments = [
  {
    id: 'comment-1',
    item_id: 'asset-hero',
    kind: 'comment',
    body: 'Can we use a darker background for the title?',
    author_email: 'marta@example.com',
    author_name: 'Marta Lopez',
    created_at: iso(-1),
    mentioned_emails: [],
  },
  {
    id: 'comment-2',
    item_id: 'asset-hero',
    kind: 'comment',
    body: 'Sure, uploading a new version today.',
    author_email: 'jon@partner.com',
    author_name: 'Jon Garnica',
    created_at: iso(-1),
    mentioned_emails: ['marta@example.com'],
  },
];
