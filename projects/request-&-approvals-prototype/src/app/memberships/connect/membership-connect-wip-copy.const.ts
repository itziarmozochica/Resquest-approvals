/**
 * ponytail: WIP copy lives here, not in `en.json`. Phrase pushes with `update_translations: false`
 * and the daily pull writes `en.json` back, so a key that has shipped once can no longer be
 * re-worded from code — and none of this copy is signed off yet.
 *
 * When it is confirmed: paste this under `memberships.connect` in `src/assets/i18n/en.json`, turning
 * each function back into its `{{param}}` form, restore the `| translate` keys in this file's
 * callers, and delete the file.
 */
export const MEMBERSHIP_CONNECT_WIP_COPY = {
  connections: {
    alreadyConnectedBody: (providerName: string) => `This partner already has a live connection to ${providerName}.`,
    alreadyConnectedHint: 'If Fever cannot read your membership data, update the connection details and approve again.',
    /** The consentless variant: there is no approval step to point the partner at. */
    alreadyConnectedHintDirect: 'If Fever cannot read your membership data, update the connection details and save them again.',
    alreadyConnectedTitle: (providerName: string) => `${providerName} is already connected`,
    authorizeAction: (providerName: string) => `Approve in ${providerName}`,
    authorizeBody: (providerName: string) =>
      `The last step is approving the connection in ${providerName}. You will sign in there and come straight back.`,
    authorizeTitle: 'Your details are saved',
    beforeYouStart: 'Before you start',
    connectedBody: (providerName: string) => `Fever can now check membership against ${providerName} when a visitor buys a ticket.`,
    connectedHint: 'Nothing else to do here. Tell your Fever contact if membership checks do not behave as you expect.',
    connectedOn: (when: string) => `Connected on ${when}.`,
    connectedTitle: (providerName: string) => `${providerName} is connected`,
    description: 'Connect your external membership system so Fever can check whether a visitor is already a member when they buy a ticket.',
    /** Replaces the redirect-URI material when the provider needs no approval step. */
    directBody: (providerName: string) =>
      `There is no approval step in ${providerName}. The connection completes right here as soon as your details are saved.`,
    helpDocumentation: (providerName: string) => `Not sure where to find these? Read the ${providerName} setup guide.`,
    loadError: 'We could not load the setup details. Try again in a minute.',
    loading: 'Loading the setup details…',
    menuLabel: 'External Providers',
    pageTitle: 'External Providers',
    /** The callback omits the `provider` param when it could not trust the state token. */
    providerFallback: 'your membership system',
    reconnectAction: 'Update connection details',
    reconnectBody: (providerName: string) => `Paste your ${providerName} details again. Fever never shows stored details back to you.`,
    reconnectSafety: (providerName: string) => `Your current connection keeps working until you approve the new one in ${providerName}.`,
    /** The consentless variant: the new details clear the provider on save, with nothing to approve. */
    reconnectSafetyDirect: (providerName: string) => `Your current connection keeps working until ${providerName} accepts the new details.`,
    reconnectTitle: (providerName: string) => `Update your ${providerName} connection`,
    reconnectUnsupported: 'This connection cannot be updated right now. Tell your Fever contact.',
    redirectUriHint: (providerName: string) =>
      `Create an application for Fever in ${providerName} and paste this web address into its redirect or callback setting. It must match exactly, including the https:// and the final slash.`,
    redirectUriHintReconnect: (providerName: string) =>
      `Check this web address is still set as the redirect or callback in your existing ${providerName} application. It must match exactly, including the final slash.`,
    redirectUriLabel: (providerName: string) => `Web address to paste into ${providerName}`,
    retry: 'Try again',
    sessionExpiredBody: 'For your security, a setup session stays open for a limited time.',
    sessionExpiredHint: 'Start again to open a fresh session and re-enter the details. You can do this as many times as you need.',
    sessionExpiredTitle: 'This setup session timed out',
    startAgain: 'Start again',
  },
  form: {
    consentNotice: (providerName: string) =>
      `When you save, we will give you a button to approve the connection in ${providerName}. Sign in there and approve. You will come straight back here.`,
    directNotice: (providerName: string) => `When you save, we will check the details with ${providerName} straight away.`,
    errors: {
      generic: 'We could not save your details. Try again in a minute.',
      maxLength: (max: number) => `Use ${max} characters or fewer.`,
      pattern: (providerName: string) => `This does not look right. Copy it again from ${providerName}.`,
      rateLimited: (seconds: string) => `Too many attempts. Wait ${seconds} seconds and try again.`,
      rejected: (providerName: string) =>
        `${providerName} did not accept these details. Check each one against your ${providerName} application and try again.`,
      rejectedField: (providerName: string) => `${providerName} did not accept this value.`,
      required: 'Fill this in.',
      url: 'Enter a full web address starting with https://',
    },
    fieldRequired: '(required)',
    hideSecretLabel: (fieldLabel: string) => `Hide ${fieldLabel}`,
    intro: (providerName: string) =>
      `Paste the details from the application you created in ${providerName}. We store them encrypted and use them only to check membership.`,
    secretHint: "These are stored encrypted, are never shown to you again, and do not appear in Fever's admin tools.",
    selectPlaceholder: 'Choose one',
    showSecretLabel: (fieldLabel: string) => `Show ${fieldLabel}`,
    submit: 'Save and connect',
    submitting: 'Checking your details…',
    title: (providerName: string) => `Your ${providerName} details`,
  },
  providerLegend: 'Membership system',
  redirectUri: {
    copied: 'Copied',
    copy: 'Copy',
    copyAriaLabel: (label: string) => `Copy ${label}`,
    copyFailed: 'We could not copy it. Select the address and copy it manually.',
  },
};

export interface MembershipConnectFailureCopy {
  body: (providerName: string) => string;
  hint: (providerName: string) => string;
  title: (providerName: string) => string;
}

/**
 * Terminal failure copy, keyed by the camelCase prefix `toFailureCopyPrefix` produces from a wire
 * reason — the same shape it will have under `memberships.connect.failures.<prefix>` once the copy
 * is signed off. Every string is a function of the provider name, interpolated or not, so a caller
 * never has to know which of the three happens to mention it.
 */
const FAILURE_COPY: Readonly<Record<string, MembershipConnectFailureCopy>> = {
  alreadyConnected: {
    body: providerName => `This venue already has a working ${providerName} connection, so there was nothing to set up.`,
    hint: () => 'To replace the stored details, pick your membership system above and choose "Update connection details".',
    title: providerName => `${providerName} is already connected`,
  },
  consentDenied: {
    body: providerName => `The approval step in ${providerName} was declined, so Fever has no access to your membership records.`,
    hint: providerName => `Start the setup again and approve the connection in ${providerName} to finish.`,
    title: () => 'The connection was not approved',
  },
  credentialsInvalid: {
    body: providerName => `One or more of the values you entered did not match what ${providerName} expects. These values were not saved.`,
    hint: providerName => `Start the setup again and re-enter the details, copying each one from your ${providerName} application.`,
    title: () => 'Some details were not accepted',
  },
  credentialsRejected: {
    body: providerName => `One of the values you entered was wrong, or has been changed in ${providerName} since you copied it.`,
    hint: providerName => `Start the setup again and re-enter the details, copying each one from your ${providerName} application.`,
    title: providerName => `${providerName} did not accept the details`,
  },
  environmentAlreadyBound: {
    body: providerName => `Another Fever venue is already connected to this ${providerName} account. Each venue needs its own.`,
    hint: () => 'Ask your Fever contact which account to use, then start the setup again.',
    title: providerName => `This ${providerName} account is already in use`,
  },
  environmentDisabled: {
    body: providerName => `The ${providerName} account you approved is marked as disabled, so we cannot read membership records from it.`,
    hint: providerName => `Ask your ${providerName} administrator for a live account, then start the setup again.`,
    title: providerName => `This ${providerName} account is switched off`,
  },
  expiredCode: {
    body: providerName => `${providerName} approvals are only valid for a short time, and this one ran out before we could use it.`,
    hint: () => 'Start the setup again and approve the connection without pausing.',
    title: () => 'The approval took too long',
  },
  expiredState: {
    body: () => 'Too much time passed between you starting the approval and finishing it, so we stopped. The connection was not completed.',
    hint: () => 'Start the setup again and complete the approval in one go.',
    title: () => 'You were away too long',
  },
  invalidCode: {
    body: providerName =>
      `${providerName} rejected the approval. This usually happens when the browser Back button is used partway through, or when an old approval page is reloaded. The connection was not completed.`,
    hint: () =>
      'Start the setup again and go through the approval in one pass, without going back. If it happens a second time, tell your Fever contact.',
    title: () => 'We could not finish the connection',
  },
  invalidState: {
    body: () => 'The reply that came back from the approval step did not look right, so we stopped. The connection was not completed.',
    hint: () => 'Start the setup again. If it happens twice, tell your Fever contact and mention what this page said.',
    title: () => 'We could not verify the response',
  },
  inviteConsumed: {
    body: () => 'Each setup link works once, and this one has already been completed.',
    hint: () => 'Ask your Fever contact whether the connection is already live, or for a new setup link.',
    title: () => 'This link has already been used',
  },
  inviteExpired: {
    body: () => 'Setup links stop working after a set period, and this one is past it.',
    hint: () => 'Ask your Fever contact for a new setup link.',
    title: () => 'This link has expired',
  },
  inviteInvalid: {
    body: () => 'The web address does not look like a Fever setup link, or part of it was lost when it was copied.',
    hint: () => "Open the original link from your Fever contact's message, or ask them to resend it.",
    title: () => 'This link is not valid',
  },
  inviteRevoked: {
    body: () => 'Fever cancelled this setup link, so it no longer works.',
    hint: () => 'Ask your Fever contact for a new setup link.',
    title: () => 'This link was cancelled',
  },
  inviteUnknown: {
    body: () => 'This setup link is no longer on file.',
    hint: () => 'Ask your Fever contact for a new setup link.',
    title: () => 'We do not recognise this link',
  },
  providerMisconfigured: {
    body: providerName =>
      `Fever's setup for ${providerName} is incomplete, so the connection could not be completed. Trying again will not fix it.`,
    hint: () => 'Tell your Fever contact and mention this page. They need to correct it before you can connect.',
    title: () => 'This connection is not set up correctly',
  },
  providerUnreachable: {
    body: providerName => `We could not reach ${providerName} just now. This is usually temporary, and the connection was not completed.`,
    hint: () => 'Start the setup again in a few minutes. If it keeps failing, tell your Fever contact.',
    title: providerName => `${providerName} did not answer`,
  },
  rateLimited: {
    body: () => 'This setup link has been used too many times in a short period, so we paused it for a moment.',
    hint: () => 'Wait a minute, then start the setup again.',
    title: () => 'Too many attempts',
  },
  unknown: {
    body: providerName => `We could not finish connecting ${providerName}. The connection was not completed.`,
    hint: () => 'Start the setup again. If it keeps failing, tell your Fever contact and mention what this page said.',
    title: () => 'Something went wrong',
  },
};

/** Only the keys whose display name a capitalised key cannot produce. The descriptor stays the authority once loaded. */
const PROVIDER_NAMES: Readonly<Record<string, string>> = { altru: 'Blackbaud Altru' };

/** Falls back to the generic copy so a reason this client has no wording for still reads as a failure. */
export function membershipConnectFailureCopy(prefix: string): MembershipConnectFailureCopy {
  return FAILURE_COPY[prefix] ?? FAILURE_COPY.unknown;
}

/** Falls back to the capitalised key so an unmapped provider is legible rather than blank. */
export function membershipConnectProviderName(key: string): string {
  return PROVIDER_NAMES[key] ?? (key === '' ? key : key.charAt(0).toUpperCase() + key.slice(1));
}
