# B2B IAM (`@fz/b2b-iam`)

Angular client library for the **b2b-iam** identity service. It wraps every authentication call —
password login, SSO, Onebox, backoffice, MFA enrolment/verification/recovery, password reset and
logout — behind one injectable facade, and owns token persistence.

`refresh()` is on the facade but is **not a refresh yet**: there is no refresh endpoint (OQ-4 / the
WI-3 backend spike), so it drops the stored token and returns a `401 reauth_required` envelope. Wire
it into an interceptor and every retry logs the user out.

It exists so that B2B Marketplace and any other consumer talk to b2b-iam through a typed contract
instead of hand-rolling requests, and so **token storage never collides with FeverZone's**.

> **Working on the code?** Read [`AGENTS.md`](AGENTS.md) first. This README is about consuming the
> library.

---

## Package facts

| Item             | Value                                        |
| ---------------- | -------------------------------------------- |
| npm name         | `@fz/b2b-iam`                                |
| Type             | Angular **library** (`projectType: library`) |
| Public API entry | [`src/public-api.ts`](src/public-api.ts)     |
| Tests            | `pnpm --filter @fz/b2b-iam test`             |

Nothing under `src/lib/core/**` is public — adapters and request builders are internal.

---

## Wiring it up

`provideB2bIam()` registers the facade and its config. Two bindings are the host's:

```ts
providers: [
  provideHttpClient(),
  provideB2bIam({
    baseUrl: environment.apiIamBaseUrl,
    clientVersion: `w.${packageVersion}`,
    tokenKey: 'b2bm.token',
  }),
  { provide: STORAGE_SERVICE, useExisting: LocalStorageService },
];
```

**`HttpClient` is not provided for you**, so the host keeps control of interceptors — a missing one
fails loudly with `NullInjectorError`.

**`STORAGE_SERVICE` is not either, and its absence is silent.** The facade injects it for token
persistence, and the token ships a tree-shakable **in-memory** default. Bind nothing and there is no
error: the token goes into a `Map` and the session evaporates on the next page load, with nothing in
the console. B2B Marketplace binds it next to `provideB2bIam` (`app.config.ts:28`).

### Config

| Field           | Why it matters                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`       | Prepended to every request path.                                                                                                                            |
| `clientVersion` | Sent as `X-Client-Version`. b2b-iam enforces a **minimum client version** and rejects a missing one with `MIN_VERSION_REQUIREMENT`. Web uses `w.<version>`. |
| `tokenKey`      | Storage key for the persisted token. Consumer-owned **on purpose**, so a consumer never collides with FeverZone's `'token'`.                                |

---

## Using the facade

Inject `B2bIamAuthClient`. Every network method returns `Observable<BaseResponse<T>>` — `getToken()`
and `clearToken()` are the two synchronous exceptions.

```ts
readonly #auth = inject(B2bIamAuthClient);

this.#auth.login(username, password).subscribe(response => {
  switch (response.data?.nextStep) {
    case LoginNextStep.MfaVerification: /* code → verifyMfa() */ break;
    case LoginNextStep.MfaEnrollment:   /* enrollMfa() → verifyMfaEnrollment() */ break;
    default:                            /* logged in */ break;
  }
});
```

**Branch on `LoginNextStep`, don't assume success means "logged in".** A successful response can
still require MFA enrolment or verification before the session is usable — that enum is why it is
part of the public API.

### Surface

| Area          | Methods                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| Login         | `login`, `ssoLogin`, `ssoLoginCallback`, `oneboxLogin`, `backofficeLogin` |
| MFA           | `enrollMfa`, `verifyMfaEnrollment`, `verifyMfa`, `recoverMfa`             |
| Password      | `requestPassword`, `resetPassword`, `validatePasswordToken`               |
| Session       | `me`, `refresh`, `logout`, `getToken`, `clearToken`, `getUserId`          |
| Organizations | `organizations`, `getDistributor`                                         |
| Authorization | `getAgreementPermissions`                                                 |

`verifyMfa` is how the `MfaVerification` branch above resolves; `verifyMfaEnrollment` closes the
`MfaEnrollment` one.

### Authorization for a counterparty

`getAgreementPermissions(organizationId, targetOrganizationId)` answers what an organization may do
**for another one** — the same kind of question as `/organizations/{id}/permissions`, scoped to a
counterparty. It returns the **whole resolved permission set** for the
`(organizationId, targetOrganizationId, user)` triple:

```ts
this.#auth.getAgreementPermissions(distributorId, partnerId).subscribe(response => {
  if (response.data === null) {
    /* no answer — decide what a missing answer means, and prefer failing closed */
    return;
  }
  const mayAct = response.data.includes(MY_FEATURE_PERMISSION); // the name is yours, not the library's
});
```

**The library never names a permission.** Which member of the set authorizes a given button, screen
or route is the consumer's rule; keeping it out means a gate can be renamed or re-scoped without a
library release — the same reasoning that keeps `LoginNextStep` public rather than collapsing a login
to a boolean.

**`data === null` is not `data === []`.** An empty array means the engine resolved nothing for that
pair; `null` means there is no answer at all (the request failed, or the body carried none). A gate
must keep those apart, and a security gate should treat the missing answer as a refusal.

Token persistence is handled inside the facade, with one deliberate gap: **an MFA-pending response is
not persisted.** It can carry an interim token, and storing it would let a route guard admit someone
before they finish MFA — `verifyMfa` and `recoverMfa` are what persist in that flow.

The facade writes two keys, `tokenKey` and `` `${tokenKey}.user-id` ``. `logout()` needs the second
to invalidate server-side; without it, it clears locally and the session stays alive on the server.
`clearToken()` removes both.
