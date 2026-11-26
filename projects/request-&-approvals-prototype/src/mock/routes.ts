import { Permissions } from '../app/shared/services/user/permissions';
import { approvalItemComments, approvals, informationRequests, launches, PARTNER_ID, USER_ID } from './data';
import { allFlagKeys, buildDatafile } from './optimizely';

export interface MockRequest {
  method: string;
  url: URL;
  body: unknown;
}
export interface MockResponse {
  status?: number;
  body: unknown;
}
interface MockRoute {
  method?: string;
  test: RegExp;
  handler: (req: MockRequest, match: RegExpMatchArray) => MockResponse;
}

const ok = (data: unknown): MockResponse => ({ body: { data, error: null } });
const P = PARTNER_ID;
type Row = Record<string, unknown>;
const byLaunch = (list: Row[], launchId: string): Row[] => list.filter(item => item['launch_id'] === launchId);
const find = (list: Row[], id: string): Row | undefined => list.find(item => item['id'] === id);
const notFound = (what: string): MockResponse => ({ status: 404, body: { data: null, error: { message: `${what} not found` } } });
const echo = (req: MockRequest, extra: Record<string, unknown> = {}): MockResponse =>
  ok({ id: `mock-${Date.now()}`, ...(typeof req.body === 'object' && req.body !== null ? (req.body as object) : {}), ...extra });

export const mockRoutes: MockRoute[] = [
  // --- optimizely: every known flag ON ---
  { test: /\/datafiles\/[^/]+\.json$/, handler: () => ({ body: buildDatafile(P, allFlagKeys()) }) },

  // --- login / session (api-iam) ---
  { method: 'POST', test: /\/api-iam\/1\.0\/login$/, handler: () => ok({ token: 'mock-token', user_id: USER_ID }) },
  { test: /\/api-iam\/1\.0\/sso\/login/, handler: () => ok({ redirect_to: null }) },
  {
    test: /\/api-iam\/1\.0\/roles/,
    handler: () =>
      ok({
        roles: [
          { id: '3880dd97-6a06-4024-8959-014633f312c2', is_public: true, label: 'admin' },
          { id: 'f0361eae-c48e-4529-8a59-bf6db8ff29cf', is_public: true, label: 'event_manager' },
        ],
      }),
  },
  { test: /\/api-iam\/1\.0\/users\/\d+\/logout/, handler: () => ok({}) },
  {
    test: /\/api-iam\/1\.0\/users\/me\/?(\?.*)?$/,
    handler: () =>
      ok({
        business: null,
        email: 'mock.user@example.com',
        id: USER_ID,
        interface: 'staff',
        kiosk: null,
        language: 'en_US',
        name: 'Mock User',
        source: 'backoffice',
        sso_enabled: false,
        status: 'active',
        type: 'superuser',
        username: 'mock.user@example.com',
      }),
  },
  {
    test: /\/api-iam\/1\.0\/organizations\/\d+\/permissions/,
    handler: () => ok({ permissions: Object.values(Permissions) }),
  },
  {
    test: /\/api-iam\/1\.0\/users\/\d+\/organizations/,
    handler: () =>
      ok({
        count: 1,
        organizations: [
          { city_code: 1023191, country_code: 'ES', deleted_at: null, id: P, name: 'Fever Demo Partner', user_role_in_organization: 'business_manager' },
        ],
      }),
  },
  {
    test: new RegExp(`/api/b2b/partners/(\\d+)/?(\\?.*)?$`),
    handler: (_r, m) => ok({ country_code: 'ES', email: 'noreply@example.com', id: Number(m[1]), name: 'Fever Demo Partner', type: 'partner' }),
  },
  { test: /\/outages/, handler: () => ok({}) },
  // --- shell chrome the layout asks for (empty on purpose) ---
  { test: /\/announcements/, handler: () => ok({ announcements: [], items: [], count: 0 }) },
  { test: /\/distributor-group-publications/, handler: () => ok({ publications: [], items: [], count: 0 }) },
  { test: /\/terminology-settings/, handler: () => ok({}) },
  { test: /\/api-notifications\//, handler: () => ok({ notifications: [], items: [], count: 0, unread_count: 0 }) },
  { test: /\/zendesk-token/, handler: () => ok({ token: 'mock' }) },
  { test: /\/chatbot\//, handler: () => ok({ prompt_versions: [], items: [] }) },

  { test: new RegExp(`/partners/(?:\\d+)/plans`), handler: () => ok({ plans: [], items: [], count: 0, total: 0 }) },

  // --- projects (launches) ---
  { test: new RegExp(`/3\\.0/settings/partners/(?:\\d+)/projects/?(\\?.*)?$`), handler: () => ok({ projects: launches }) },
  {
    test: new RegExp(`/3\\.0/settings/partners/(?:\\d+)/projects/([^/?]+)/?(\\?.*)?$`),
    handler: (_r, m) => {
      const launch = find(launches, m[1]);
      return launch ? ok(launch) : notFound('project');
    },
  },
  { test: new RegExp(`/3\\.0/partners/(?:\\d+)/projects/[^/]+/drive-folder/`), handler: () => ok(null) },

  // --- approvals ---
  {
    method: 'GET',
    test: new RegExp(`/3\\.0/partners/(?:\\d+)/projects/([^/]+)/approvals/?(\\?.*)?$`),
    handler: (_r, m) => ok({ approvals: byLaunch(approvals, m[1]) }),
  },
  { method: 'GET', test: new RegExp(`/3\\.0/partners/(?:\\d+)/approvals/?(\\?.*)?$`), handler: () => ok({ approvals }) },
  {
    method: 'GET',
    test: new RegExp(`/3\\.0/partners/(?:\\d+)/(?:projects/[^/]+/)?approvals/([^/]+)/?(\\?.*)?$`),
    handler: (_r, m) => {
      const found = find(approvals, m[1]);
      return found ? ok(found) : notFound('approval');
    },
  },
  {
    test: new RegExp(`/3\\.0/partners/(?:\\d+)/(?:projects/[^/]+/)?approvals/[^/]+/items/([^/]+)/comments/?(\\?.*)?$`),
    handler: (req, m) =>
      req.method === 'POST'
        ? ok({ ...(req.body as object), id: `comment-${Date.now()}`, item_id: m[1], kind: 'comment', author_email: 'mock.user@example.com', author_name: 'Mock User', created_at: new Date().toISOString() })
        : ok({ comments: approvalItemComments.filter(c => c.item_id === m[1]) }),
  },
  { method: 'POST', test: new RegExp(`/3\\.0/partners/(?:\\d+)/(?:projects/[^/]+/)?approvals/?(\\?.*)?$`), handler: req => echo(req, { status: 'SUBMITTED', assets: [], rows: [], timeline: [] }) },

  // --- information requests ---
  {
    method: 'GET',
    test: new RegExp(`/3\\.0/partners/(?:\\d+)/projects/([^/]+)/information-requests/?(\\?.*)?$`),
    handler: (_r, m) => ok({ information_requests: byLaunch(informationRequests, m[1]) }),
  },
  { method: 'GET', test: new RegExp(`/3\\.0/partners/(?:\\d+)/information-requests/?(\\?.*)?$`), handler: () => ok({ information_requests: informationRequests }) },
  {
    method: 'GET',
    test: new RegExp(`/3\\.0/partners/(?:\\d+)/(?:projects/[^/]+/)?information-requests/([^/]+)/?(\\?.*)?$`),
    handler: (_r, m) => {
      const found = find(informationRequests, m[1]);
      return found ? ok(found) : notFound('information request');
    },
  },
  { method: 'POST', test: new RegExp(`/3\\.0/partners/(?:\\d+)/(?:projects/[^/]+/)?information-requests/?(\\?.*)?$`), handler: req => echo(req, { status: 'PENDING', attachments: [], timeline: [] }) },
];
